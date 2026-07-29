// chatbot.js - GPT-API-free Version (No API Key Needed!)
// Uses free DeepSeek API via chatanywhere.tech

const API_URL = "https://api.chatanywhere.tech/v1/chat/completions";
const MODEL_NAME = "deepseek-v3.2"; // or "deepseek-r1", "deepseek-v4"

let chatVisible = false;
let chatHistory = [];

// --- INITIALIZATION ---
function initChatbot() {
  const chatHTML = `
    <div class="chatbot-button" id="chatbotButton" title="Chat with SmileBot">💬</div>
    <div class="chatbot-panel hidden" id="chatbotPanel">
      <div class="chatbot-header">
        <span>🤖 SmileBot</span>
        <button class="chatbot-close" id="chatbotClose">✕</button>
      </div>
      <div class="chatbot-messages" id="chatbotMessages"></div>
      <div class="chatbot-input-row">
        <input class="chatbot-input" id="chatbotInput" placeholder="Type a message..." maxlength="200">
        <button class="chatbot-send" id="chatbotSend">Send</button>
      </div>
    </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.id = 'chatbotWrapper';
  wrapper.innerHTML = chatHTML;
  document.body.appendChild(wrapper);

  const saved = window.SmileHubStorage ? window.SmileHubStorage.get('smilehub_chat_history', []) : [];
  chatHistory = Array.isArray(saved) ? saved : [];

  document.getElementById('chatbotButton').addEventListener('click', toggleChat);
  document.getElementById('chatbotClose').addEventListener('click', toggleChat);
  document.getElementById('chatbotSend').addEventListener('click', sendMessage);
  document.getElementById('chatbotInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
  });

  if (chatHistory.length === 0) {
    setTimeout(function() {
      addBotMessage("Hi there! 😁 I'm SmileBot, powered by DeepSeek AI. Ask me about products, orders, shipping, or anything about SmileHub!");
    }, 500);
  }
}

// --- TOGGLE CHAT ---
function toggleChat() {
  chatVisible = !chatVisible;
  const panel = document.getElementById('chatbotPanel');
  const button = document.getElementById('chatbotButton');
  panel.classList.toggle('hidden', !chatVisible);
  button.textContent = chatVisible ? '✕' : '💬';

  if (chatVisible) {
    renderMessages();
    document.getElementById('chatbotInput').focus();
    if (!document.querySelector('.chatbot-message.bot') && chatHistory.length === 0) {
      addBotMessage("Hi there! 😁 I'm SmileBot, powered by DeepSeek AI. Ask me about products, orders, shipping, or anything about SmileHub!");
    }
  }
}

// --- SEND MESSAGE ---
async function sendMessage() {
  const input = document.getElementById('chatbotInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addUserMessage(text);

  const typingDiv = showTyping();

  try {
    // Build conversation context
    const messages = [
      { role: "system", content: "You are SmileBot, a helpful assistant for SmileHub Dental Supplies. Answer questions about dental products, orders, shipping, and the website. Keep responses friendly, informative, and concise." }
    ];

    const recentHistory = chatHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }

    messages.push({ role: "user", content: text });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    
    typingDiv.remove();
    addBotMessage(reply);

  } catch (error) {
    console.error("API error:", error);
    typingDiv.remove();
    
    let errorMessage = "I'm sorry, I'm having trouble connecting right now. ";
    if (error.message && error.message.includes('429')) {
      errorMessage = "I'm sorry, I've reached the daily limit for today. Try again tomorrow! 🥺";
    } else {
      errorMessage += "Please try again in a moment. 🙏";
    }
    addBotMessage(errorMessage);
  }
}

// --- ADD MESSAGES ---
function addUserMessage(text) {
  const container = document.getElementById('chatbotMessages');
  const div = document.createElement('div');
  div.className = 'chatbot-message user';
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  chatHistory.push({ role: 'user', text: text });
  saveHistory();
}

function addBotMessage(text) {
  const container = document.getElementById('chatbotMessages');
  const div = document.createElement('div');
  div.className = 'chatbot-message bot';
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  chatHistory.push({ role: 'bot', text: text });
  saveHistory();
}

function showTyping() {
  const container = document.getElementById('chatbotMessages');
  const div = document.createElement('div');
  div.className = 'chatbot-message bot typing';
  div.textContent = 'Typing...';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function renderMessages() {
  const container = document.getElementById('chatbotMessages');
  container.innerHTML = '';

  if (chatHistory.length === 0) return;

  for (const entry of chatHistory) {
    const div = document.createElement('div');
    div.className = 'chatbot-message ' + entry.role;
    div.textContent = entry.text;
    container.appendChild(div);
  }

  container.scrollTop = container.scrollHeight;
}

function saveHistory() {
  if (window.SmileHubStorage) {
    window.SmileHubStorage.set('smilehub_chat_history', chatHistory.slice(-50));
  }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', initChatbot);