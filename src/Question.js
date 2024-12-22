import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./App.css";
import Select from "react-select";
import askGemini from "./gemini";
import { toBeRequired } from "@testing-library/jest-dom/dist/matchers";

const Question = ({
  setQuestion,
  setAnswer,
  setResponder,
  setVerification,
  setQuestionHistory,
  questionHistory, // questionHistory を props として受け取る
  updateQuestionHistory, // updateQuestionHistory を props として受け取る
}) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedResponder, setSelectedResponderState] = useState(null);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const navigate = useNavigate();
  const [showResponderSelection, setShowResponderSelection] = useState(true);
  const [showExplanationSelection, setShowExplanationSelection] =
    useState(false);
  const [showQuestionSelection, setShowQuestionSelection] = useState(false);
  const [showSubmitButton, setShowSubmitButton] = useState(false);
  const [showVerificatioPattern, setShowVerificationPattern] = useState(false);
  const [geminiCreateQuestion, setGeminiCreateQuestion] = useState();
  const geminiCreateQuestionHistory = [];
  const [verificationPattern, setVerificationPattern] = useState();

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

  const questionOptions = [
    { value: "0", label: "アップルバナナついて教えてください。" },
    { value: "1", label: "マルエスファームについて教えてください。" },
    {
      value: "2",
      label: "アップルバナナの美味しい食べ方について教えてください。",
    },
    { value: "3", label: "アップルバナナついて教えてください。" },
    { value: "4", label: "マルエスファームについて教えてください。" },
    { value: "5", label: "キッチンカーについて教えてください。" },
    { value: "6", label: "アップルバナナを育てる上でこだわりはありますか？" },
    { value: "7", label: "アップルバナナの美味しい食べ方を教えてください。" },
    {
      value: "8",
      label: "マルエスファームではアップルバナナ以外に何を栽培していますか？",
    },
    { value: "9", label: "台風の多い沖縄ではどのような備えをしますか？" },
    { value: "10", label: "自由記述" },
  ];

  const verificationOptions = [
    { value: "0", label: "よりよく理解してもらうため、荘司さんがさらに深堀する質問を考えてそれへの回答で還元情報を補足します。" },
    { value: "1", label: "正確に質問に回答するために補足すると役に立つ情報を引き出す質問をして回答をまとめます。" },
  ];


  const sendMessageToGemini = async (message, questions) => {
    setIsWaiting(true);
    try {
      if (
        selectedResponder === "荘司さん（会話しながら回答）" &&
        selectedVerification === "0"
      ) {
        setAnswer(geminiCreateQuestionHistory); // 回答を state に設定
        setQuestion(message); // 質問を state に設定
        setResponder(selectedResponder);
        setVerification(selectedVerification);
        navigate("/answer");
      } else {
        const answer = await askGemini(message);
        if (
          selectedResponder === "荘司さん（会話しながら回答）" &&
          selectedVerification === "1"
        ) {
          const geminiCreateQuestionAndAnswer = [
            { role: "user", content: questions },
            { role: "assistant", content: answer },
          ];
          //geminiが作った質問と回答を更新
          geminiCreateQuestionHistory.push(geminiCreateQuestionAndAnswer);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          console.log(
            "Updated geminiCreateQuestionHistory:",
            geminiCreateQuestionHistory
          );

          setAnswer(geminiCreateQuestionHistory); // 回答を state に設定
          setQuestion(message); // 質問を state に設定
          setResponder(selectedResponder);
          setVerification(selectedVerification);
          navigate("/answer");
        } else {
          setAnswer(answer); // 回答を state に設定
          setQuestion(message); // 質問を state に設定
          setResponder(selectedResponder);
          setVerification(selectedVerification);
          navigate("/answer");
        }
      }
    } catch (error) {
      console.error("Gemini API 関連のエラー:", error); // エラーメッセージを修正
      setAnswer("Gemini API でエラーが発生しました。もう一度試してください。");
      setResponder(selectedResponder);
      setVerification(selectedVerification);
      navigate("/answer");
    } finally {
      setIsWaiting(false);
    }
  };

  const getReferenceFromAPI = async (message, group) => {
    setIsWaiting(true);
    try {
      let collectedQuestions = [];
      let score_count = 0;
      const questionText =
        selectedQuestion === "10"
          ? inputValue
          : questionOptions.find((option) => option.value === selectedQuestion)
              ?.label || "";

      if (
        selectedResponder === "荘司さん（会話しながら回答）" &&
        selectedVerification === "1"
      ) {
        while (score_count < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const first_prompt = `
            タスク:質問文である${questionText}に関して、より具体的な質問を考えてください。\n
            トピック:農業、沖縄、アップルバナナ、マルエスファーム\n
            話者:あなたはプロの記者です。\n
            出力形式:JSON形式で1つだけ提案してください。JSONのフォーマットは {'suggestions': [{'question': '質問'}]} としてください。JSONのフォーマットの外には文字を出力しないでください。
            注意点:${geminiCreateQuestionHistory}はこれまであなたが考えた具体的な質問とその回答です。似通った質問は出力しないでください。${geminiCreateQuestionHistory}が空の場合は、これが初めての質問です。
          `;
          const presentQuestion = await askGemini(first_prompt);
          const jsonString = presentQuestion.match(/\{.*\}/s);

          if (jsonString) {
            // シングルクォートをダブルクォートに置換
            const fixedJsonString = jsonString[0].replace(/'/g, '"');
            const json = JSON.parse(fixedJsonString); // 修正後の文字列をパース
            console.log(json);

            const presentGeminiQuestion = json.suggestions[0].question;

            console.log(presentGeminiQuestion);
            const response = await axios.post("http://localhost:8000/api/llm", {
              message: presentGeminiQuestion,
              group: null,
            });
            const similarity_score = response.data.score;
            const literature = response.data.message;
            console.log(similarity_score);
            if (similarity_score > 3.0) {
              const preset_question_prompt = `
                タスク:データベースの情報を参照して、入力の答えを回答してください。データベースに回答がない場合は情報を補完し、「データベースに記載がない」は言わなくて結構です。\n
                トピック:農業、沖縄、アップルバナナ、マルエスファーム\n
                話者:あなたは"${selectedResponder}"です。\n
                オーディエンス:"${selectedExplanation}"に説明してください。\n   
                長さ:回答は300文字程度にしてください。\n
                出力形式:文章\n
                ##データベース\n
                "${literature}"\n
                \n
                ##入力\n
                "${presentGeminiQuestion}"
              `;

              //geminiが作った質問に対する回答
              const presentAnswer = await askGemini(preset_question_prompt);

              //一つの変数に質問と回答をまとめる
              const geminiCreateQuestionAndAnswer = [
                { role: "user", content: presentGeminiQuestion },
                { role: "assistant", content: presentAnswer },
              ];

              //geminiが作った質問と回答を更新
              geminiCreateQuestionHistory.push(geminiCreateQuestionAndAnswer);

              score_count += 1;
            }
          }
        }
      } else if (
        selectedResponder === "荘司さん（会話しながら回答）" &&
        selectedVerification === "0"
      ) {
        const response = await axios.post("http://localhost:8000/api/llm", {
          message: questionText,
          group: group,
        });
        const context = response.data.message;

        const base_first_prompt = `
        タスク:データベースの情報を参照して、入力の答えを回答してください。データベースに回答がない場合は情報を補完し、「データベースに記載がない」は言わなくて結構です。\n
        トピック:農業、沖縄、アップルバナナ、マルエスファーム\n
        話者:あなたは"${selectedResponder}"です。「こんにちは、荘司幸一郎です。」と自己紹介を生成された結果の上に追加してください。\n
        オーディエンス:"${selectedExplanation}"に説明してください。\n
        長さ:回答は300文字程度にしてください。\n
        出力形式:文章\n
        ##データベース\n
        "${context}"\n
        \n
        \n
        ##入力\n
        "${questionText}"
      `;
        const base_answer = await askGemini(base_first_prompt);

        const geminiCreateQuestionAndAnswer = [
          { role: "user", content: questionText },
          { role: "assistant", content: base_answer },
        ];

        //geminiが作った質問と回答を更新
        geminiCreateQuestionHistory.push(geminiCreateQuestionAndAnswer);

        const second_prompt = `
          タスク:入力に対してデータベースをもとに回答が得られています。よりわかりやすい質問を入力とデータベースと回答をもとに１つ考えてください。\n
          トピック:農業、沖縄、アップルバナナ、マルエスファーム\n
          話者:あなたは"${selectedResponder}"です。\n
          オーディエンス:"${selectedExplanation}"に説明してください。\n
          長さ:一行\n
          出力形式:JSONにて出力し、フォーマットは {'suggestions': [{'question': '質問'}]} としてください。JSONのフォーマットの外には文字を出力しないでください。\n
          ##入力\n
          "${questionText}"\n
          \n
          ##データベース\n
          "${context}"\n
          \n
          ##回答\n
          "${base_answer}"\n
        `;

        while (score_count < 3) {
          const refinement = await askGemini(second_prompt);
          const jsonString = refinement.match(/\{.*\}/s);

          if (jsonString) {
            // シングルクォートをダブルクォートに置換
            const fixedJsonString = jsonString[0].replace(/'/g, '"');
            const json = JSON.parse(fixedJsonString); // 修正後の文字列をパース
            console.log(json);

            const presentGeminiQuestion = json.suggestions[0].question;

            console.log(presentGeminiQuestion);
            const response = await axios.post("http://localhost:8000/api/llm", {
              message: presentGeminiQuestion,
              group: null,
            });
            const similarity_score = response.data.score;
            const literature = response.data.message;
            console.log(similarity_score);
            if (similarity_score > 3.0) {
              const third_prompt = `
                タスク:データベースの情報を参照して、入力の答えを回答してください。データベースに回答がない場合は情報を補完し、「データベースに記載がない」は言わなくて結構です。\n
                トピック:農業、沖縄、アップルバナナ、マルエスファーム\n
                話者:あなたは"${selectedResponder}"です。\n
                オーディエンス:"${selectedExplanation}"に説明してください。\n
                長さ:100文字程度\n
                出力形式:文章\n
                注意点:${geminiCreateQuestionHistory}はこれまであなたが考えた具体的な質問とその回答です。似通った質問は出力しないでください。${geminiCreateQuestionHistory}の１つめは無視し、１つの場合はこれが初めての質問です。
                ##データベース\n
                "${literature}"\n
                \n
                ##入力\n
                "${presentGeminiQuestion}"\n
              `;
              const refinement_answer = await askGemini(third_prompt);

              const geminiCreateQuestionAndAnswer = [
                { role: "user", content: presentGeminiQuestion },
                { role: "assistant", content: refinement_answer },
              ];

              //geminiが作った質問と回答を更新
              geminiCreateQuestionHistory.push(geminiCreateQuestionAndAnswer);

              score_count += 1;
            }
          }
        }
      }

      const response = await axios.post("http://localhost:8000/api/llm", {
        message: questionText,
        group: group,
      });

      const context = response.data.message;

      console.log("回答パターン:" + selectedResponder);

      if (
        selectedResponder === "荘司さん（会話しながら回答）" &&
        selectedVerification === "1"
      ) {
        const allHistory = geminiCreateQuestionHistory;

        const formattedMessage = `
        タスク:データベースの情報を参照して、入力の答えを回答してください。データベースに回答がない場合は情報を補完し、「データベースに記載がない」は言わなくて結構です。過去の履歴は入力に対する具体的な質問とその回答になっています。過去の履歴も参照して回答してください。したがって、入力に対してデータベースと過去の履歴を参考に回答してください。\n
        トピック:農業、沖縄、アップルバナナ、マルエスファーム\n
        話者:あなたは"${selectedResponder}"です。「こんにちは、荘司幸一郎です。」と自己紹介を生成された結果の上に追加してください。\n
        オーディエンス:"${selectedExplanation}"に説明してください。\n
        長さ:回答は300文字程度にしてください。\n
        出力形式:文章\n
        ##データベース\n
        "${context}"\n
        \n
        ##過去の履歴
        "${allHistory}"\n
        \n
        ##入力\n
        "${questionText}"
      `;

        sendMessageToGemini(formattedMessage, questionText);
      } else if (
        selectedResponder === "荘司さん（会話しながら回答）" &&
        selectedVerification === "0"
      ) {
        sendMessageToGemini("", questionText);
      } else {
        const formattedMessage = `
        タスク:データベースの情報を参照して、入力の答えを回答してください。データベースに回答がない場合は情報を補完し、「データベースに記載がない」は言わなくて結構です。\n
        トピック:農業、沖縄、アップルバナナ、マルエスファーム\n
        話者:あなたは"${selectedResponder}"です。\n
        オーディエンス:"${selectedExplanation}"に説明してください。\n
        長さ:回答は300文字程度にしてください。\n
        出力形式:文章\n
        ##データベース\n
        "${context}"\n
        \n
        \n
        ##入力\n
        "${questionText}"
      `;
        sendMessageToGemini(formattedMessage, questionText); // Gemini に送信
      }
    } catch (error) {
      console.error("APIリクエストエラー: ", error);
      setAnswer("エラーが発生しました。もう一度試してください。");
      setResponder(selectedResponder);
      setVerification(selectedVerification);
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
    const message =
      selectedQuestion === "10"
        ? inputValue
        : questionOptions.find((option) => option.value === selectedQuestion)
            ?.label || ""; // questionOptions から label を取得
    updateQuestionHistory(message);
    getReferenceFromAPI(message, group);
  };

  useEffect(() => {
    setShowExplanationSelection(selectedResponder !== null);
  }, [selectedResponder]);

  useEffect(() => {
    setShowQuestionSelection(selectedExplanation !== null);
  }, [selectedExplanation]);

  useEffect(() => {
    setShowVerificationPattern(selectedQuestion !== null);
  }, [selectedQuestion]);

  useEffect(() => {
    // selectedResponder が変更されたときに showVerificationPattern を更新
    if (
      selectedResponder === "荘司さん（会話しながら回答）" &&
      selectedQuestion
    ) {
      // selectedQuestionの条件を追加
      setShowVerificationPattern(true);
      setShowSubmitButton(false);
    } else {
      setShowVerificationPattern(false);
      if (selectedQuestion) {
        // selectedQuestionがある場合のみ送信ボタンを表示
        setShowSubmitButton(true);
      }
    }
  }, [selectedResponder, selectedQuestion]);

  // 初期化：localStorageから質問履歴を取得して状態に設定
  useEffect(() => {
    const storedQuestions =
      JSON.parse(localStorage.getItem("questionHistory")) || [];
    setQuestionHistory(storedQuestions); // ここで使用する
  }, []);

  return (
    <div className="question-all-container">
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
              inputId="responder-select" // アクセシビリティのためにidを追加
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
                inputId="explanation-select" // アクセシビリティのためにidを追加
                value={explanationOptions.find(
                  (option) => option.value === selectedExplanation
                )}
                onChange={(e) => {
                  setSelectedExplanation(e.value);
                  setShowQuestionSelection(true); // 質問の選択を表示
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
                inputId="question-select" // アクセシビリティのためにidを追加
                value={questionOptions.find(
                  (option) => option.value === selectedQuestion
                )}
                onChange={(e) => {
                  setSelectedQuestion(e.value);
                }}
                options={questionOptions}
                isSearchable={false}
                placeholder="選んでください"
              />
            </div>
          )}

          {selectedQuestion === "10" && (
            <div className="input-section">
              <label htmlFor="free-input">
                質問したいことを入力してください
              </label>
              <input
                type="text"
                id="free-input" // アクセシビリティのためにidを追加
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSubmitButton(e.target.value !== ""); // 入力が空でない場合に送信ボタンを表示
                }}
                placeholder="入力してください。"
                disabled={isWaiting}
              />
            </div>
          )}

          {showVerificatioPattern && (
            <div className="question-options">
              <label htmlFor="question-select">
                質問のパターンを選んでください
              </label>
              <Select
                inputId="question-select" // アクセシビリティのためにidを追加
                value={verificationOptions.find(
                  (option) => option.value === selectedVerification
                )}
                onChange={(e) => {
                  setSelectedVerification(e.value);
                  setShowSubmitButton(true); // 質問を選択したら送信ボタンを表示
                }}
                options={verificationOptions}
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
      <div className="question-history">
        <h1>過去の履歴</h1>
        <div className="question-history-text">
          {questionHistory.map(
            (
              question,
              index // questionHistory を使用して履歴を表示
            ) => (
              <p key={index}>・{question}</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Question;
