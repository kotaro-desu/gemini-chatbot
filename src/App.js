import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Question from "./Question";
import Answer from "./Answer";
import "./App.css";

const App = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [responder, setResponder] = useState("ロボット");
  const [verification, setVerification] = useState("");
  const [questionHistory, setQuestionHistory] = useState(() => {
    const storedHistory = localStorage.getItem("questionHistory");
    return storedHistory ? JSON.parse(storedHistory) : [];
  });

  const updateQuestionHistory = (newQuestion) => {
    const updatedHistory = [...questionHistory, newQuestion];
    setQuestionHistory(updatedHistory);
    localStorage.setItem("questionHistory", JSON.stringify(updatedHistory));
  };

  useEffect(() => {
    const clearHistoryOnReload = () => {
      localStorage.removeItem("questionHistory");
    };

    window.addEventListener("beforeunload", clearHistoryOnReload);

    return () => {
      window.removeEventListener("beforeunload", clearHistoryOnReload);
    };
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              <Question
                setQuestion={setQuestion}
                setAnswer={setAnswer}
                setResponder={setResponder}
                setVerification={setVerification}
                setQuestionHistory={setQuestionHistory}
                questionHistory={questionHistory}
                updateQuestionHistory={updateQuestionHistory}
              />
            }
          />
          <Route
            path="/answer"
            element={
              <Answer
                question={question}
                answer={answer}
                responder={responder}
                verification={verification}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
