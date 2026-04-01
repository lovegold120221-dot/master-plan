import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for OpenCode execution
  app.post("/api/execute-todo", async (req, res) => {
    const { todoList } = req.body;

    if (!todoList || !Array.isArray(todoList)) {
      return res.status(400).json({ error: "Invalid todo list" });
    }

    try {
      // Format the todo list for OpenCode
      const tasksDescription = todoList
        .map((item: any) => {
          const tasks = item.tasks.map((t: any) => `- ${t.name}: ${t.description}`).join("\n");
          return `### ${item.title}\n${tasks}`;
        })
        .join("\n\n");

      const prompt = `Execute the following project plan:\n\n${tasksDescription}`;
      
      console.log("Executing OpenCode with prompt:", prompt);

      // Call OpenCode CLI
      // Assuming 'opencode' is installed and in the path
      // We use 'npx -y opencode' as a fallback if it's not installed globally, 
      // but the user said it's for local use where they likely have it installed.
      const { stdout, stderr } = await execPromise(`opencode "${prompt.replace(/"/g, '\\"')}"`);

      res.json({ 
        success: true, 
        output: stdout, 
        error: stderr 
      });
    } catch (error: any) {
      console.error("OpenCode execution error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        details: "Make sure opencode CLI is installed: curl -fsSL https://opencode.ai/install | bash"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
