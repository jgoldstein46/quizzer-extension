import 'dotenv/config';
import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Add JSON body parsing middleware

// Define a route handler for the default home page
import { quizController } from "./quiz/controller";

app.post("/generate-quiz", async (req , res) => {
  const { articleContent, articleTitle, articleUrl, settings = {}, articleMetadata = {} } = req.body;
  console.log('Received request:', req.body);
  if (!articleContent || !articleTitle || !articleUrl) {
    return res.status(400).json({ success: false, error: "Missing required fields: articleContent, articleTitle, or articleUrl" });
  }

  try {
    const request = {
      articleContent,
      articleTitle,
      articleUrl,
      questionCount: settings.questionsPerQuiz || 3,
      difficultyLevel: settings.difficultyLevel || "intermediate",
      quizType: settings.quizType || "factual",
      articleMetadata,
    };
    const quizResult = await quizController.generateQuiz(request);
    if (quizResult.success && quizResult.quiz) {
      return res.json({ success: true, quiz: quizResult.quiz, metadata: quizResult.metadata });
    } else {
      return res.status(500).json({ success: false, error: quizResult.error || "Quiz generation failed" });
    }
  } catch (error) {
    console.error("Error generating quiz:", error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
