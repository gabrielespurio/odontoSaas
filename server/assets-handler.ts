// Dedicated assets handler for production deployment
import type { Express, Request, Response } from "express";
import path from "path";
import fs from "fs";

export function setupAssetsHandler(app: Express): void {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  
  console.log("🔧 Assets Handler Setup:");
  console.log("  - Assets path:", path.join(distPath, "assets"));
  console.log("  - Assets directory exists:", fs.existsSync(path.join(distPath, "assets")));
  
  if (fs.existsSync(path.join(distPath, "assets"))) {
    const assetsFiles = fs.readdirSync(path.join(distPath, "assets"));
    console.log("  - Available assets:", assetsFiles);
  }

  // Priority route for JavaScript files
  app.get('/assets/*.js', (req: Request, res: Response) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(distPath, 'assets', fileName);
    
    console.log(`⚡ ASSETS JS: ${req.path} -> ${fileName}`);
    
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ JS File found: ${filePath} (${stats.size} bytes)`);
        
        // Set correct headers for JavaScript
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Send the file
        return res.sendFile(filePath, (err) => {
          if (err) {
            console.error(`❌ Error sending JS file:`, err);
            res.status(500).send('Error serving JavaScript file');
          } else {
            console.log(`✅ Successfully served JS file: ${fileName}`);
          }
        });
      } else {
        console.log(`❌ JS file not found: ${filePath}`);
        console.log(`📁 Available files in assets:`, fs.readdirSync(path.join(distPath, 'assets')));
        return res.status(404).send('JavaScript file not found');
      }
    } catch (error) {
      console.error(`💥 Error handling JS request:`, error);
      return res.status(500).send('Internal server error');
    }
  });

  // Priority route for CSS files
  app.get('/assets/*.css', (req: Request, res: Response) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(distPath, 'assets', fileName);
    
    console.log(`🎨 ASSETS CSS: ${req.path} -> ${fileName}`);
    
    try {
      if (fs.existsSync(filePath)) {
        console.log(`✅ CSS File found: ${filePath}`);
        
        // Set correct headers for CSS
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        
        return res.sendFile(filePath, (err) => {
          if (err) {
            console.error(`❌ Error sending CSS file:`, err);
            res.status(500).send('Error serving CSS file');
          } else {
            console.log(`✅ Successfully served CSS file: ${fileName}`);
          }
        });
      } else {
        console.log(`❌ CSS file not found: ${filePath}`);
        return res.status(404).send('CSS file not found');
      }
    } catch (error) {
      console.error(`💥 Error handling CSS request:`, error);
      return res.status(500).send('Internal server error');
    }
  });

  // Generic assets route for other files
  app.get('/assets/*', (req: Request, res: Response) => {
    const fileName = path.basename(req.path);
    const filePath = path.join(distPath, 'assets', fileName);
    
    console.log(`📁 ASSETS OTHER: ${req.path} -> ${fileName}`);
    
    try {
      if (fs.existsSync(filePath)) {
        console.log(`✅ Asset found: ${filePath}`);
        return res.sendFile(filePath);
      } else {
        console.log(`❌ Asset not found: ${filePath}`);
        return res.status(404).send('Asset not found');
      }
    } catch (error) {
      console.error(`💥 Error handling asset request:`, error);
      return res.status(500).send('Internal server error');
    }
  });
}