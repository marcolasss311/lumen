<div align="center">
  <img src="https://img.shields.io/badge/Status-Em%20Desenvolvimento-blue?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
  <br>
  <h1>🌟 Plataforma Lumen</h1>
  <p><strong>A Revolução nos Estudos Guiada por Inteligência Artificial</strong></p>
</div>

---

A **Lumen** é uma plataforma educacional inovadora que permite aos estudantes criar baterias de exercícios e simulados totalmente personalizados, combinando um robusto banco de dados de provas oficiais com o poder de geração e correção da inteligência artificial (Google Gemini).

## 🚀 Principais Funcionalidades

- 🧠 **Geração Inteligente de Questões:** Escolha a matéria, tópico e nível escolar. Se a plataforma não encontrar questões suficientes no banco de dados, a IA cria questões inéditas (múltipla escolha ou discursivas) instantaneamente, calibradas para a dificuldade escolhida.
- 📝 **Correção de Discursivas em Lote:** Chega de esperar o professor corrigir. Finalize seu simulado e deixe a IA analisar suas respostas dissertativas segundo o gabarito, dando notas (de 0 a 100) e feedbacks pedagógicos detalhados do que você acertou e onde errou.
- 🎯 **Filtro de Provas Oficiais:** Prefere estudar com as provas reais? Marque o filtro e o sistema priorizará questões originais de bancas como ENEM, FUVEST, Unicamp, etc., usando a IA apenas para completar a bateria caso necessário.
- 📊 **Dashboard & Histórico de Desempenho:** Acompanhe suas notas gerais. Suas baterias de exercícios ficam salvas automaticamente, permitindo consultar resoluções passadas a qualquer momento.
- 📄 **Exportação em PDF:** Gostou do simulado gerado? Exporte-o para um PDF limpo e diagramado para imprimir e resolver no papel!
- 🌓 **Modo Escuro (Dark Mode):** Interface moderna e limpa, com botão interativo para alternar para o modo noturno com proteção visual.

---

## 🛠️ Tecnologias Utilizadas

A Lumen é um projeto Fullstack moderno, separado em duas camadas:

### Frontend (Interface do Aluno)
- **Next.js (React)** - Framework para renderização rápida e roteamento inteligente.
- **Tailwind CSS v4** - Estilização utilitária de ponta, incluindo esquemas de cores adaptáveis.
- **Lucide Icons** - Ícones minimalistas.
- **Firebase Auth** - Sistema seguro de autenticação (Email/Senha e Google Login).

### Backend (API e Banco de Dados)
- **Node.js + Express** - Servidor robusto para rotear a lógica de correção.
- **PostgreSQL** - Banco de dados relacional para armazenar questões oficiais e o histórico dos alunos.
- **Google Gemini API (`@google/genai`)** - O cérebro por trás da geração de conteúdo e correção rigorosa das questões. Modelos: `gemini-3.6-flash`.

---

## 💻 Como Rodar o Projeto Localmente

Se você deseja contribuir ou rodar a Lumen na sua própria máquina, siga os passos abaixo:

### 1. Pré-requisitos
- Node.js instalado (v18 ou superior)
- Git instalado
- Uma conta no [Firebase](https://console.firebase.google.com/) (Para autenticação)
- Uma [API Key do Google Gemini AI](https://aistudio.google.com/)
- Banco de Dados PostgreSQL (Local ou em nuvem como Supabase/Render)

### 2. Configurando o Backend
1. Entre na pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` com suas credenciais de ambiente (Gemini e Banco de Dados):
   ```env
   PORT=3001
   DATABASE_URL=postgres://seu_usuario:sua_senha@localhost:5432/seu_banco
   GEMINI_API_KEY=sua_chave_secreta_aqui
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   ```
   > *Nota: Na primeira inicialização, o servidor criará automaticamente as tabelas necessárias no banco de dados através das migrações internas.*

### 3. Configurando o Frontend
1. Entre na pasta do frontend:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env.local` conectando sua API e seu Firebase:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   NEXT_PUBLIC_FIREBASE_API_KEY=sua_chave_firebase
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_id
   NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
   ```
4. Inicie a interface:
   ```bash
   npm run dev
   ```

A plataforma estará disponível em `http://localhost:3000`! 🎉

---

## 📄 Licença
Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes. Desenvolvido para transformar a forma como alunos estudam.
