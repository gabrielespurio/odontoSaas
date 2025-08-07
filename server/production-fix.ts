// Production fixes for OdontoSync
// This file contains all the necessary fixes to ensure the system works correctly in production

import type { Express, Request, Response, NextFunction } from "express";

// Add debug endpoint for production troubleshooting
export function addProductionDebugRoutes(app: Express) {
  // Debug route to check user authentication status
  app.get("/api/debug/user-data", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.json({ 
          authenticated: false, 
          message: "No token provided" 
        });
      }

      // Log for debugging in production
      console.log("Debug request - Token present:", !!token);
      console.log("Debug request - Headers:", JSON.stringify(req.headers, null, 2));
      
      res.json({
        authenticated: !!token,
        tokenPresent: !!token,
        authHeader: !!authHeader,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Debug endpoint error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Debug route to check company access
  app.get("/api/debug/companies-access", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      console.log("Companies access debug - Token present:", !!token);
      
      res.json({
        tokenPresent: !!token,
        environment: process.env.NODE_ENV,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Companies access debug error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

// Enhanced error handling for production
export function addProductionErrorHandling(app: Express) {
  // Add comprehensive error logging
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Production error:", {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Ensure proper JSON response
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
        timestamp: new Date().toISOString(),
        path: req.url
      });
    }

    if (!res.headersSent) {
      next();
    }
  });

  // Frontend error logging endpoint
  app.post("/api/debug/frontend-error", async (req: Request, res: Response) => {
    try {
      console.log("Frontend error reported:", req.body);
      res.json({ received: true });
    } catch (error) {
      console.error("Error logging frontend error:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });
}