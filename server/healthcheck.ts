import express from "express";

export function setupHealthcheck(app: express.Express) {
  // Health check endpoint para o Replit
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'DentalCare'
    });
  });

  // Endpoint de status para verificação
  app.get('/status', (req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DentalCare - Status</title>
        <meta http-equiv="refresh" content="2;url=/">
      </head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>🦷 DentalCare Sistema Ativo</h1>
        <p>Servidor funcionando corretamente na porta 5000</p>
        <p>Redirecionando para aplicação principal...</p>
        <script>setTimeout(() => window.location.href = '/', 1000);</script>
      </body>
      </html>
    `);
  });
}