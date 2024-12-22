import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";
import Select from "react-select";
import askGemini from "./gemini";
import questionBox from "./question_box.json";

const Question2 = ({ setQuestion, setAnswer, setResponder }) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedResponder, setSelectedResponderState] = useState(null);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const navigate = useNavigate();
  const [showResponderSelection, setShowResponderSelection] = useState(true);
  const [showExplanationSelection, setShowExplanationSelection] =
    useState(false);
  const [showQuestionSelection, setShowQuestionSelection] = useState(false);
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [questionOptions, setQuestionOptions] = useState([]);
  const [concreteQuestionOptions, setConcreteQuestionOptions] = useState([]); // concrete_questionsの状態を追加
  const [selectedConcreteQuestion, setSelectedConcreteQuestion] =
    useState(null); // concrete_questionsの選択状態
  const [moreSpecificQuestionOptions, setMoreSpecificQuestionOptions] =
    useState([]); // more_specific_questionsの状態を追加
  const [selectedMoreSpecificQuestion, setSelectedMoreSpecificQuestion] =
    useState(null);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const json = questionBox;

        if (json && json.questions && Array.isArray(json.questions)) {
          const options = json.questions.map((item, index) => ({
            label: item.abstract_question,
            value: index.toString(), // value を追加 (後続の処理で必要なら)
            concrete_questions: item.concrete_questions, // concrete_questions を含める
          }));
          setQuestionOptions(options);
        } else {
          console.error("question_box.json の形式が正しくありません。", json);
          setQuestionOptions([{ label: "デフォルトの質問1" }]);
        }
      } catch (error) {
        console.error(
          "question_box.json の読み込み/パースに失敗しました:",
          error
        );
        setQuestionOptions([{ label: "デフォルトの質問1" }]);
      }
    };

    loadQuestions();
  }, []);

  const responderOptions = [
    { value: "ロボット", label: "ロボット" },
    { value: "荘司さん", label: "荘司さん" },
    {
      value: "荘司さん（会話しながら回答）",
      label: "荘司さん（会話しながら回答）",
    },
  ];

  const explanationOptions = [
    { value: "おとな向け", label: "おとな向け" },
    { value: "こども向け", label: "こども向け" },
  ];

  const sendMessageToGemini = async (message) => {
    setIsWaiting(true);
    try {
      const answer = await askGemini(message); // askGemini を使用して回答を取得
      console.log(answer);
      setAnswer(answer); // 回答を state に設定
      setQuestion(message); // 質問を state に設定
      setResponder(selectedResponder);
      navigate("/answer");
    } catch (error) {
      console.error("Gemini API 関連のエラー:", error); // エラーメッセージを修正
      setAnswer("Gemini API でエラーが発生しました。もう一度試してください。");
      setResponder(selectedResponder);
      navigate("/answer");
    } finally {
      setIsWaiting(false);
    }
  };

  const getReferenceFromAPI = async (message, group) => {
    setIsWaiting(true);
    try {
      let message;

      // メッセージ内容の選択
      if (selectedResponder === "荘司さん（会話しながら回答）") {
        if (selectedMoreSpecificQuestion) {
          message = selectedMoreSpecificQuestion.label; // 最も具体的な質問（more_specific_questions）
        } else if (selectedConcreteQuestion) {
          message = selectedConcreteQuestion.label; // 次に具体的な質問（concrete_questions）
        } else {
          message = selectedQuestion?.label || ""; // 抽象的な質問（abstract_question）
        }
      } else {
        // 他の回答者は abstract_question を使用
        message = selectedQuestion?.label || "";
      }

      const response = await axios.post("http://localhost:8000/api/gpt", {
        message: message,
        group: group,
      });

      const context = response.data.message;
      const questionText = selectedQuestion?.label || ""; // デフォルトで abstract_question を使用

      // メッセージ内容の選択
      let promptMessage;
      if (selectedResponder === "荘司さん（会話しながら回答）") {
        if (selectedMoreSpecificQuestion) {
          promptMessage = selectedMoreSpecificQuestion.label; // more_specific_questions
        } else if (selectedConcreteQuestion) {
          promptMessage = selectedConcreteQuestion.label; // concrete_questions
        } else {
          promptMessage = questionText; // abstract_question (デフォルト)
        }
      } else {
        promptMessage = questionText; // 他の回答者は abstract_question
      }

      const formattedMessage = `
        あなたは"${selectedResponder}"です。\n
        "${selectedExplanation}"に説明してください。\n
        データベースの情報を参照して、入力の答えを回答してください。\n
        データベースに回答がない場合は情報を補完し、「データベースに記載がない」は言わなくて結構です。\n
        回答は300文字程度にしてください。\n
        ##データベース\n
        "${context}"\n
        \n
        ##入力\n
        "${promptMessage}"
      `;

      sendMessageToGemini(formattedMessage);
    } catch (error) {
      console.error("APIリクエストエラー: ", error);
      setAnswer("エラーが発生しました。もう一度試してください。");
      setResponder(selectedResponder);
      navigate("/answer");
      setIsWaiting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let group = 0;
    if (selectedResponder === "荘司さん") {
      group = 1;
    }
    const message = selectedQuestion ? selectedQuestion.label : inputValue; // 選択されたオブジェクトから label を取得
    getReferenceFromAPI(message, group);
  };

  useEffect(() => {
    setShowExplanationSelection(selectedResponder !== null);
  }, [selectedResponder]);

  useEffect(() => {
    setShowQuestionSelection(selectedExplanation !== null);
  }, [selectedExplanation]);

  const handleAbstractQuestionChange = (selectedOption) => {
    setSelectedQuestion(selectedOption);
    setShowSubmitButton(selectedResponder !== "荘司さん（会話しながら回答）");

    if (selectedOption && selectedOption.concrete_questions) {
      const concreteOptions = selectedOption.concrete_questions.map(
        (item, index) => ({
          label: item.question,
          value: index.toString(),
          more_specific_questions: item.more_specific_questions,
        })
      );
      setConcreteQuestionOptions(concreteOptions);
    } else {
      setConcreteQuestionOptions([]); // concrete_questionsがない場合、選択肢を空にする
    }
  };

  const handleConcreteQuestionChange = (selectedOption) => {
    setSelectedConcreteQuestion(selectedOption);
    setShowSubmitButton(selectedResponder !== "荘司さん（会話しながら回答）");

    if (selectedOption && selectedOption.more_specific_questions) {
      const moreSpecificOptions = selectedOption.more_specific_questions.map(
        (item, index) => ({
          label: item.question,
          value: index.toString(),
        })
      );
      setMoreSpecificQuestionOptions(moreSpecificOptions);
    } else {
      setMoreSpecificQuestionOptions([]);
    }
  };

  const handleMoreSpecificQuestionChange = (selectedOption) => {
    setSelectedMoreSpecificQuestion(selectedOption);

    // 「荘司さん（会話しながら回答）」の場合のみmore_specific_questions選択時に送信ボタンを表示
    if (selectedResponder === "荘司さん（会話しながら回答）") {
      setShowSubmitButton(true);
    }
  };

  return (
    <div className="question-container">
      <div
        className={`icon ${
          selectedResponder === null
            ? "icon-default"
            : selectedResponder === "ロボット"
            ? "icon-robot"
            : "icon-shoji"
        }`}
      />
      <h1>質問</h1>
      <form onSubmit={handleSubmit} className="input-form">
        <div className="question-selection">
          <label htmlFor="responder-select">回答者を選んでください</label>
          <Select
            inputId="responder-select"
            value={responderOptions.find(
              (option) => option.value === selectedResponder
            )}
            onChange={(e) => {
              setSelectedResponderState(e.value);
              setShowResponderSelection(false);
              setShowExplanationSelection(true);
            }}
            options={responderOptions}
            isSearchable={false}
            placeholder="選んでください"
          />
        </div>

        {showExplanationSelection && (
          <div className="explanation-selection">
            <label htmlFor="explanation-select">
              回答の説明の仕方を選べます
            </label>
            <Select
              inputId="explanation-select"
              value={explanationOptions.find(
                (option) => option.value === selectedExplanation
              )}
              onChange={(e) => {
                setSelectedExplanation(e.value);
                setShowQuestionSelection(true);
              }}
              options={explanationOptions}
              isSearchable={false}
              placeholder="選んでください"
            />
          </div>
        )}

        {showQuestionSelection && (
          <div className="question-options">
            <label htmlFor="question-select">
              質問したいことを選んでください
            </label>
            <Select
              inputId="question-select"
              value={questionOptions.find(
                (option) => option.value === selectedQuestion
              )}
              onChange={(e) => handleAbstractQuestionChange(e)}
              options={questionOptions}
              isSearchable={false}
              placeholder="選んでください"
            />
          </div>
        )}

        {selectedResponder === "荘司さん（会話しながら回答）" &&
          concreteQuestionOptions.length > 0 && (
            <div className="concrete-question-options">
              <label htmlFor="concrete-question-select">
                具体的な質問を選んでください
              </label>
              <Select
                inputId="concrete-question-select"
                value={concreteQuestionOptions.find(
                  (option) => option.value === selectedConcreteQuestion
                )}
                onChange={(e) => handleConcreteQuestionChange(e)}
                options={concreteQuestionOptions}
                isSearchable={false}
                placeholder="選んでください"
              />
            </div>
          )}

        {selectedResponder === "荘司さん（会話しながら回答）" &&
          moreSpecificQuestionOptions.length > 0 && (
            <div className="more-specific-question-options">
              <label htmlFor="more-specific-question-select">
                さらに具体的な質問を選んでください
              </label>
              <Select
                inputId="more-specific-question-select"
                value={moreSpecificQuestionOptions.find(
                  (option) => option.value === selectedMoreSpecificQuestion
                )}
                onChange={(e) => handleMoreSpecificQuestionChange(e)}
                options={moreSpecificQuestionOptions}
                isSearchable={false}
                placeholder="選んでください"
              />
            </div>
          )}

        {showSubmitButton && (
          <button
            className="question-sousin-button"
            type="submit"
            disabled={isWaiting}
          >
            {isWaiting ? "待機中..." : "質問する"}
          </button>
        )}
      </form>
    </div>
  );
};

export default Question2;
