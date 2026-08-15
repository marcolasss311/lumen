const admin = require('../../core/firebase');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido.' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Erro na verificação do token:", error);
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

module.exports = authMiddleware;
