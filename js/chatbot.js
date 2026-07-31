// chatbot.js - Supports OpenAI (ChatGPT) or DeepSeek API
// Set one of the API keys below to enable. OpenAI takes priority if both are set.
// For OpenAI: get key at https://platform.openai.com/api-keys
// For DeepSeek: get key at https://platform.deepseek.com/api_keys

const OPENAI_API_KEY = ''; // Your OpenAI API key (sk-...)
const DEEPSEEK_API_KEY = ''; // Your DeepSeek API key (optional, fallback)
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// If no API keys are set, SmileBot answers from a built-in knowledge base.
function getLocalAnswer(text) {
  var q = String(text || '').toLowerCase();

  if (/(shipping|deliver|ship|delivery)/.test(q) && /(fee|cost|price|much|free|charge)/.test(q)) {
    return 'Shipping is free on orders over ₱3,000. Metro Manila orders otherwise cost ₱150 and arrive within 1-3 business days. Provincial orders may take 3-7 business days.';
  }
  if (/(order|track|status)/.test(q)) {
    return 'Log in and open the Orders page to see your order status: Pending, Processing, Shipped, or Delivered. Each order has a printable invoice.';
  }
  if (/(payment|pay|gcash|card|cash on delivery|billing)/.test(q)) {
    return 'We accept GCash, Credit Card, and Cash on Delivery within Metro Manila. GCash and card payments are simulated in this demo checkout.';
  }
  if (/(product|item|catalog|stock|buy|available|brand)/.test(q)) {
    return 'Browse our catalog on the Products page. We carry oral care, instruments, PPE, restorative materials, disposables, impression materials, orthodontics, and equipment.';
  }
  if (/(return|refund|exchange|policy)/.test(q)) {
    return 'Unopened items can be returned within 7 days of delivery. Contact support through the Contact page to start a return.';
  }
  if (/(account|login|sign in|register|password|profile)/.test(q)) {
    return 'Create an account on the Register page and sign in on the Login page. Use the Profile page to update your details or change your password.';
  }
  if (/(coupon|discount|promo|voucher|code)/.test(q)) {
    return 'Use coupon code SMILE10 at checkout to get 10% off your order. Apply it on the cart or checkout page.';
  }
  if (/(contact|support|email|phone|call|help)/.test(q)) {
    return 'Reach us through the Contact page, or check the FAQ page for quick answers about shipping, returns, and payments.';
  }
  if (/(hello|hi|hey|good (morning|afternoon|evening))/.test(q)) {
    return "Hello! I'm SmileBot. Ask me about products, orders, shipping, payments, or coupons.";
  }
  return "I'm only able to help with SmileHub-related questions. Please ask me about our products, orders, shipping, or account!";
}

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
      addBotMessage("Hi there! 😁 I'm SmileBot. Ask me about products, orders, shipping, or anything about SmileHub!");
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
      addBotMessage("Hi there! 😁 I'm SmileBot. Ask me about products, orders, shipping, or anything about SmileHub!");
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
      { role: "system", content: "You are SmileBot, an assistant ONLY for SmileHub Dental Supplies. ONLY answer questions about: dental products, orders, shipping, the website, or account help. For ANY other topic, politely say: 'I'm only able to help with SmileHub-related questions. Please ask me about our products, orders, or account!' Keep responses friendly, informative, and concise." }
    ];

    const recentHistory = chatHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }

    messages.push({ role: "user", content: text });

    var useOpenAI = OPENAI_API_KEY.length > 0;
    var useDeepSeek = !useOpenAI && DEEPSEEK_API_KEY.length > 0;

    if (!useOpenAI && !useDeepSeek) {
      setTimeout(function() {
        typingDiv.remove();
        addBotMessage(getLocalAnswer(text));
      }, 600);
      return;
    }

    var apiUrl = useOpenAI ? 'https://api.openai.com/v1/chat/completions' : DEEPSEEK_API_URL;
    var apiKey = useOpenAI ? OPENAI_API_KEY : DEEPSEEK_API_KEY;
    var model = useOpenAI ? 'gpt-4o-mini' : 'deepseek-chat';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
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