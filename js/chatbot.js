// SmileBot uses the secure Firebase Function endpoint at /api/ai/chat.
// No AI provider key is stored in browser JavaScript.
// Until the backend provider is configured, the built-in SmileHub knowledge base is used.

// If no API keys are set, SmileBot answers from a built-in knowledge base.
function getLocalAnswer(text) {
  var raw = String(text || '').trim();
  var q = raw.toLowerCase();
  var lastUser = chatHistory.slice().reverse().find(function (entry) { return entry.role === 'user' && entry.text !== raw; });
  var context = lastUser ? String(lastUser.text || '').toLowerCase() : '';

  if (/^(hi+|h+i+|helo+|hello+|hey+|yo+|good\s*(morning|afternoon|evening))[\s!.?]*$/.test(q)) {
    return "Hi! I can help you shop, compare products, understand checkout, track an order, or fix an account issue. What are you trying to do today?";
  }
  if (/(don'?t know|idk|not sure|where.*start|help me choose|first time)/.test(q)) {
    return "No problem. Start with one of these: 1) tell me what dental item you need, 2) tell me your budget, 3) ask me to compare products, or 4) ask for checkout/account help. For example: “I need affordable gloves for a clinic.”";
  }
  if (/(thank|thanks|ty)/.test(q)) {
    return "You’re welcome. Tell me what you want to do next and I’ll guide you step by step.";
  }
  if (/(who are you|are you ai|real ai|smart)/.test(q)) {
    return "I’m SmileBot. Right now I use SmileHub’s built-in product and support knowledge when the secure AI backend is unavailable. Once the Firebase AI function is connected to an AI provider, I can handle broader, more natural conversations.";
  }
  if (/(shipping|deliver|ship|delivery)/.test(q) && /(fee|cost|price|much|free|charge)/.test(q)) {
    return 'Shipping is free on orders over ₱3,000. Metro Manila orders otherwise cost ₱150 and usually arrive within 1–3 business days; provincial deliveries may take 3–7 business days.';
  }
  if (/(order|track|status)/.test(q)) {
    return 'Open Account → Orders to view current and past orders. Statuses include Pending, Processing, Shipped, Out for Delivery, Delivered, and Cancelled.';
  }
  if (/(checkout|can'?t checkout|place order|redirect|change password)/.test(q)) {
    return 'At checkout, complete the shipping fields and verify your phone directly on the checkout page. You should no longer be redirected to Change Password. If OTP fails, check the inline message for quota, domain, or code errors.';
  }
  if (/(payment|pay|gcash|card|cash on delivery|billing)/.test(q)) {
    return 'SmileHub currently shows GCash, card, and Cash on Delivery choices. Until a payment provider is connected, GCash and card remain sandbox/demo flows.';
  }
  if (/(compare|difference|which is better)/.test(q)) {
    return 'Open Products, choose up to four items with Compare, then open the comparison page. Tell me the product names and your budget and I can also help explain the differences.';
  }
  if (/(product|item|catalog|stock|buy|available|brand|recommend)/.test(q)) {
    return 'Tell me the item type, intended use, and budget. Example: “Recommend disposable gloves under ₱500 for a small clinic.” You can also browse Products and filter by category, price, stock, or rating.';
  }
  if (/(return|refund|exchange|policy)/.test(q)) {
    return 'Open Account → Returns to submit a request. Keep the order number and reason ready. Unopened eligible items can be requested for return within the stated return period.';
  }
  if (/(account|login|sign in|register|password|profile|otp|phone)/.test(q)) {
    return 'Use Profile to edit personal details, upload a photo, save a delivery address, and manage notifications. Phone OTP can now be completed directly at checkout.';
  }
  if (/(coupon|discount|promo|voucher|code)/.test(q)) {
    return 'Try SMILE10 in the cart or checkout coupon field for the current demo discount.';
  }
  if (/(contact|support|email|phone|call|help)/.test(q)) {
    return 'Use Contact for a support request, FAQ for common questions, or tell me the exact problem here and I’ll guide you through the relevant SmileHub page.';
  }
  if (context && /(product|recommend|budget)/.test(context) && /^\d+([,.]\d+)?$/.test(q)) {
    return 'Got it—your budget is around ₱' + q + '. Tell me what kind of product you need so I can narrow the catalog.';
  }
  return 'I may not have enough detail yet. Are you asking about shopping, a product, checkout, an order, your account, shipping, or returns? Tell me what happened and what you expected.';
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
      addBotMessage("Hi! I’m SmileBot. I can help you choose products, compare items, solve checkout problems, and navigate your account. What would you like to do?");
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
      addBotMessage("Hi! I’m SmileBot. I can help you choose products, compare items, solve checkout problems, and navigate your account. What would you like to do?");
    }
  }
}

// --- SEND MESSAGE ---
async function sendMessage() {
  const input = document.getElementById('chatbotInput');
  const sendButton = document.getElementById('chatbotSend');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;
  sendButton.disabled = true;
  addUserMessage(text);
  const typingDiv = showTyping();

  try {
    var user = (window.firebase && firebase.auth) ? firebase.auth().currentUser : null;
    var token = user ? await user.getIdToken() : '';

    var cart = [];
    try {
      if (window.SmileHubStorage) {
        cart = window.SmileHubStorage.get('smilehub_cart', []) || [];
      } else {
        cart = JSON.parse(localStorage.getItem('smilehub_cart') || '[]');
      }
    } catch (_error) {
      cart = [];
    }

    var currentProduct = null;
    try {
      if (typeof getCurrentProduct === 'function') currentProduct = getCurrentProduct();
    } catch (_error) {
      currentProduct = null;
    }

    var response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { 'Authorization': 'Bearer ' + token } : {}
      ),
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(-12),
        page: window.location.pathname,
        cart: Array.isArray(cart) ? cart.slice(0, 20) : [],
        currentProduct: currentProduct
      })
    });

    var data = {};
    try {
      data = await response.json();
    } catch (_error) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || ('AI request failed with status ' + response.status));
    }

    var reply = data && (data.reply || data.message);
    if (!reply) throw new Error('AI response was empty.');

    typingDiv.remove();
    addBotMessage(String(reply));
  } catch (error) {
    console.warn('SmileBot AI unavailable; using built-in help.', error);
    typingDiv.remove();
    addBotMessage(getLocalAnswer(text));
  } finally {
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
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