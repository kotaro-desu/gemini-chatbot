// gemini.js
import axios from "axios";

const API_KEY = ""; // 環境変数から API キーを取得

const askGemini = async (prompt) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates[0] &&
      response.data.candidates[0].content
    ) {
      let answer = response.data.candidates[0].content.parts[0].text;
      answer = answer.replace(/\*\*/g, "").replace(/\*/g, "");
      return answer;
    } else {
      console.error("Gemini API returned unexpected data:", response.data);
      return "Gemini APIから予期しないデータが返されました。";
    }
  } catch (error) {
    console.error("Gemini APIリクエストエラー: ", error);
    return "Gemini APIでエラーが発生しました。";
  }
};

export default askGemini;
