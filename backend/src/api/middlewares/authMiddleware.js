const admin = require('../../core/firebase');
const { getAuth } = require('firebase-admin/auth');
const db = require('../../db');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido ou inválido.' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await getAuth().verifyIdToken(token);
        req.user = decodedToken;

        // Garante que o usuário existe no banco relacional antes de qualquer requisição avançar
        await db.query(
            `INSERT INTO usuarios (firebase_uid, email, nome) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (firebase_uid) DO NOTHING`,
            [decodedToken.uid, decodedToken.email || null, decodedToken.name || 'Usuário Lumen']
        );

        next();
    } catch (error) {
        console.error("Erro na verificação do token:", error);
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

module.exports = authMiddleware;
