import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import "./App.css";
import askGemini from "./gemini";
import axios from "axios";
import PropTypes from "prop-types";

const Answer = ({ question, answer, responder, verification }) => {
  const navigate = useNavigate();
  const [isSatisfied, setIsSatisfied] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [conversation, setConversation] = useState(() => {
    const storedConversation = localStorage.getItem("conversation");
    return storedConversation ? JSON.parse(storedConversation) : [];
  });
  const [currentAnswer, setCurrentAnswer] = useState(answer);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [displayedAnswers, setDisplayedAnswers] = useState([]);

  useEffect(() => {
    console.log("answer prop in useEffect:", answer);
    if (responder === "荘司さん（会話しながら回答）") {
      if (Array.isArray(answer)) {
        setDisplayedAnswers(answer.slice(0, 4));
      } else {
        console.error("answer prop は配列ではありません:", answer);
        setDisplayedAnswers([]);
      }
    } else if (typeof answer === "string") {
      setCurrentAnswer(answer);
    } else {
      console.error("answer prop は無効な型です:", answer);
      setCurrentAnswer("");
    }
  }, [answer, responder]);

  useEffect(() => {
    console.log("Answer in second useEffect:", answer);
  }, [answer]);

  useEffect(() => {
    if (question && answer && conversation.length === 0) {
      const initialAnswerContent =
        responder === "荘司さん（会話しながら回答）"
          ? Array.isArray(answer) && answer.length > 0
            ? answer[0][1].content
            : ""
          : typeof answer === "string"
          ? answer
          : "";

      const updatedConversation = [
        { role: "user", content: question },
        { role: "assistant", content: initialAnswerContent },
      ];
      setConversation(updatedConversation);
      localStorage.setItem("conversation", JSON.stringify(updatedConversation));
    }
  }, [question, answer, conversation, responder]);

  useEffect(() => {
    if (isSatisfied === false) {
      const prompt =
        conversation.map((turn) => `${turn.role}: ${turn.content}`).join("\n") +
        "\nuser: 満足のいく回答ではありませんでした。他にどのような質問をすれば良いでしょうか？JSON形式で３つ提案してください。JSONのフォーマットは {'suggestions': [{'question': '質問1'}, {'question': '質問2'}, {'question': '質問3'}]} としてください。JSONのフォーマットの外には文字を出力しないでください。";

      askGemini(prompt).then((geminiResponse) => {
        console.log("Gemini からのレスポンス (生のデータ):", geminiResponse);

        try {
          const jsonString = geminiResponse.match(/\{.*\}/s);
          if (jsonString) {
            const fixedJsonString = jsonString[0].replace(/'/g, '"');
            const json = JSON.parse(fixedJsonString);
            setSuggestedQuestions(json.suggestions);
          } else {
            console.error(
              "有効な JSON 形式ではありませんでした。受信データ:",
              geminiResponse
            );
            setSuggestedQuestions([]);
          }
        } catch (error) {
          console.error(
            "JSON パースエラー:",
            error,
            "受信データ:",
            geminiResponse
          );
          setSuggestedQuestions([]);
        }
      });
    } else {
      setSuggestedQuestions([]);
    }
  }, [isSatisfied, conversation]);

  const handleSatisfaction = (satisfied) => {
    setIsSatisfied(satisfied);
  };

  const handleSuggestedQuestionClick = (suggestedQuestion) => {
    setFeedback(suggestedQuestion);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post("http://localhost:8000/api/gpt", {
        message: feedback,
        group: 0,
      });

      const context = response.data.message;
      const newQuestion = `データベースの情報を参照して、入力の答えを回答してください。\n回答は200文字以内にしてください。\n##データベース\n"${context}"\n\n##入力\n"${feedback}"`;
      const prompt =
        conversation.map((turn) => `${turn.role}: ${turn.content}`).join("\n") +
        `\nuser: ${newQuestion}`;
      const newAnswer = await askGemini(prompt);

      setCurrentAnswer(newAnswer);
      setFeedback("");
      setIsSatisfied(null);

      const updatedConversation = [
        ...conversation,
        { role: "user", content: newQuestion },
        { role: "assistant", content: newAnswer },
      ];
      setConversation(updatedConversation);
      localStorage.setItem("conversation", JSON.stringify(updatedConversation));
    } catch (error) {
      console.error("エラー:", error);
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  return (
    <div className="answer-container">
      <div
        className={`icon ${
          responder === "ロボット" ? "icon-robot" : "icon-shoji"
        }`}
      />
      <h1>回答</h1>
      <div className="answer">
        <strong className="kaitou">回答:</strong>
        <div className="answer-text">
          {(() => {
            if (
              responder === "荘司さん（会話しながら回答）" &&
              verification === "1"
            ) {
              return displayedAnswers.map((item, index) => (
                <div key={index}>
                  <p>
                    {index === 3 ? (
                      <strong>まとめの質問：</strong>
                    ) : (
                      <strong>具体的な質問：</strong>
                    )}
                    {item[0]?.content || "内容がありません"}
                  </p>
                  <p></p>
                  <p>
                    {index === 3 ? (
                      <strong>まとめの質問の回答：</strong>
                    ) : (
                      <strong>具体的な質問の回答：</strong>
                    )}
                    {item[1]?.content || "内容がありません"}
                  </p>
                  <br />
                </div>
              ));
            } else if (
              responder === "荘司さん（会話しながら回答）" &&
              verification === "0"
            ) {
              return (
                <>
                  <div key={0}>
                    <p>
                      {displayedAnswers[0]?.[1]?.content || "内容がありません"}
                    </p>
                    <br />
                  </div>
                  {displayedAnswers.length > 1 && (
                    <strong>より分かりやすい質問と回答を表示します</strong>
                  )}
                  {displayedAnswers.slice(1).map((item, index) => (
                    <div key={index + 1}>
                      <p>
                        <strong>
                          <p>{index + 1}</p> <p>質問：</p>
                        </strong>
                        {item[0]?.content || "内容がありません"}
                      </p>
                      <p></p>
                      <p>
                        <strong>
                          <p>回答：</p>
                        </strong>
                        {item[1]?.content || "内容がありません"}
                      </p>
                      <br />
                    </div>
                  ))}
                </>
              );
            } else {
              return <p>{currentAnswer}</p>;
            }
          })()}
        </div>
      </div>
      <button className="answer-goback-button" onClick={handleGoBack}>
        戻る
      </button>
    </div>
  );
};

Answer.propTypes = {
  question: PropTypes.string,
  answer: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(
      PropTypes.arrayOf(
        PropTypes.shape({
          role: PropTypes.string.isRequired,
          content: PropTypes.string.isRequired,
        })
      )
    ),
  ]),
  responder: PropTypes.string,
};

export default Answer;
