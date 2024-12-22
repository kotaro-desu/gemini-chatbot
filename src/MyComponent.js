import axios from "axios";

const MyComponent = async ({ question }) => {
  try {
    const response = await axios.post("https://your-azure-api-endpoint", {
      prompt: question,
      max_tokens: 150,
    });

    // Azure GPTからの応答を取得
    const gptAnswer = response.data.choices[0].text.trim();
    return gptAnswer;
  } catch (error) {
    console.error("Error fetching GPT response:", error);
    return "APIの呼び出しに失敗しました";
  }
};

export default MyComponent;
