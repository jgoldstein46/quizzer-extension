import 'dotenv/config';
import express, { Express, NextFunction } from "express";
import { createServer, type Server } from "http";
import { serveStatic, setupVite } from "./vite";

const app = express();

app.use(express.json()); // Add JSON body parsing middleware

// Define a route handler for the default home page
import { quizController } from "./quiz/controller";

app.post("/generate-quiz", async (req, res) => {
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
      questionTypes: settings.questionTypes || ["multiple_choice"],
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

const registerRoutes = (app: Express): Server => {
  // Error handling middleware for JSON parsing errors
  app.use((err: any, req: Express.Request, res: any, next: any) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON" });
    }
    next(err);
  });
  const server = createServer(app);
  return server;
};


(async () => {
  const server = registerRoutes(app);

  app.use((err: any, _req: Express.Request, res: Express.Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = (process.env.PORT as unknown as number) || 3000;

  const startServer = async (initialPort: number) => {
    let currentPort = initialPort;
    let serverStarted = false;
    
    while (!serverStarted) {
      try {
        await server.listen(currentPort);
        console.log(`Server running on port ${currentPort}`);
        serverStarted = true;
      } catch (err) {
        if ((err as any).code === 'EADDRINUSE') {
          console.log(`Port ${currentPort} in use, trying ${currentPort + 1}`);
          currentPort += 1;
        } else {
          console.error('Server failed to start:', err);
          throw err;
        }
      }
    }
  }

  startServer(port).catch(console.error);
})();
