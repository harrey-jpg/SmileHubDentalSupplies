const chatbotResponses = [
  { keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'], response: 'Hello! Welcome to SmileHub Dental Supplies. How can I help you today?' },
  { keywords: ['product', 'catalog', 'shop', 'buy', 'dental'], response: 'We offer a wide range of dental products across categories like Oral Care, Instruments, PPE, Restorative, Disposables, and more. You can browse our full catalog at the Products page!' },
  { keywords: ['toothbrush', 'toothpaste', 'mouthwash', 'floss', 'oral care'], response: 'Our Oral Care category includes toothbrushes, toothpaste, mouthwash, and dental floss from trusted brands like SmilePro, Dentiva, and Oracare. Check them out in our Products page!' },
  { keywords: ['price', 'cost', 'how much', 'cheap', 'expensive'], response: 'Our products range from ₱99 for dental floss to premium equipment like dental chairs. You can see the exact prices on each product page or in the catalog.' },
  { keywords: ['stock', 'available', 'in stock', 'availability'], response: 'Stock levels are displayed on each product card and product detail page. Most items have plenty of stock, but high-demand items may run low.' },
  { keywords: ['order', 'orders', 'my order', 'purchase', 'checkout'], response: 'You can view your order history on the Orders page. Once you check out, orders are saved and marked as "Processing." We also send a confirmation toast message!' },
  { keywords: ['shipping', 'delivery', 'ship', 'free shipping', 'metro manila'], response: 'We offer free shipping on orders over ₱3,000! Standard shipping within Metro Manila costs ₱150. Delivery runs Monday through Saturday.' },
  { keywords: ['return', 'refund', 'exchange', 'cancel'], response: 'For return and exchange inquiries, please check our FAQ page or contact us through the Contact page. We aim to resolve issues quickly!' },
  { keywords: ['payment', 'pay', 'vat', 'tax'], response: 'We accept various payment methods available at checkout. A 12% VAT is applied to all orders, and the total is shown before you confirm.' },
  { keywords: ['wishlist', 'save', 'favorite'], response: 'You can save products to your wishlist by clicking the heart icon on any product card. View your saved items on the Wishlist page!' },
  { keywords: ['cart', 'add to cart', 'shopping cart', 'bag'], response: 'To add items to your cart, click the "Add to Cart" button on any product. You can review your cart, adjust quantities, or remove items on the Cart page.' },
  { keywords: ['account', 'login', 'register', 'sign in', 'sign up', 'profile'], response: 'You can register a new account or log in from the Login page. Once logged in, you can manage your profile, track orders, and use the cart and wishlist.' },
  { keywords: ['admin', 'dashboard', 'manage'], response: 'The Admin Dashboard is available to admin accounts only. It includes KPIs, product management, order views, and more.' },
  { keywords: ['contact', 'support', 'help', 'email', 'phone'], response: 'You can reach us through the Contact page, or email us at support@smilehub.ph. We\'re happy to assist with any concerns!' },
  { keywords: ['about', 'company', 'smilehub'], response: 'SmileHub Dental Supplies is your reliable online dental supply partner for clinics, professionals, and students across the Philippines. This project is an academic frontend demo.' },
  { keywords: ['developer', 'who made', 'team', 'creator'], response: 'SmileHub was built by a student team: Harry Barasona (Frontend), Yuan Coyyao (UI/UX), Giann Ed Louise Garcia (Backend), Nikko Pensocas (Frontend), and Marck Jarrel Queling (Project Lead). Check the Developers page for more info!' },
  { keywords: ['coupon', 'discount', 'promo', 'sale', 'voucher'], response: 'Try the coupon code "SMILE10" at checkout for a discount! (Note: this is a demo feature.)' },
  { keywords: ['thank', 'thanks', 'appreciate'], response: 'You\'re welcome! If you have more questions, feel free to ask. Happy shopping at SmileHub! 😊' }
];

const fallbackResponse = 'I\'m not sure about that, but I can help with products, orders, shipping, returns, and more! Try asking about our catalog, cart, or account.';

let chatVisible = false;
let chatHistory = [];

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
  document.getElementById('chatbotInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendMessage();
  });
}

function toggleChat() {
  chatVisible = !chatVisible;
  const panel = document.getElementById('chatbotPanel');
  const button = document.getElementById('chatbotButton');
  panel.classList.toggle('hidden', !chatVisible);
  button.textContent = chatVisible ? '✕' : '💬';

  if (chatVisible) {
    renderMessages();
    document.getElementById('chatbotInput').focus();
    if (!document.querySelector('.chatbot-message.bot')) {
      addBotMessage('Hi there! 👋 I\'m SmileBot, your AI assistant. Ask me about products, orders, shipping, or anything about SmileHub!');
    }
  }
}

function sendMessage() {
  const input = document.getElementById('chatbotInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addUserMessage(text);

  const typingDiv = showTyping();

  setTimeout(function () {
    typingDiv.remove();
    const reply = getResponse(text);
    addBotMessage(reply);
  }, 400 + Math.random() * 600);
}

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

function getResponse(message) {
  const lower = message.toLowerCase();

  for (const entry of chatbotResponses) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        return entry.response;
      }
    }
  }

  return fallbackResponse;
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

document.addEventListener('DOMContentLoaded', initChatbot);
