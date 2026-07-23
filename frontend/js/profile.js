document.addEventListener('DOMContentLoaded', function () {
  const profileForm = document.getElementById('profileForm');
  const addressForm = document.getElementById('addressForm');
  const passwordForm = document.getElementById('passwordForm');

  if (!profileForm || !window.SmileHubAuth) return;

  loadProfile();

  profileForm.addEventListener('submit', saveProfileInformation);
  addressForm.addEventListener('submit', saveAddress);
  passwordForm.addEventListener('submit', changePassword);
});

function loadProfile() {
  const account = window.SmileHubAuth.getCurrentAccount();
  if (!account) return;

  document.getElementById('profileFirstName').value = account.firstName || '';
  document.getElementById('profileLastName').value = account.lastName || '';
  document.getElementById('profileEmail').value = account.email || '';
  document.getElementById('profilePhone').value = account.phone || '';
  document.getElementById('profileAddress').value = account.address || '';

  const profileName = document.getElementById('profileName');
  if (profileName) profileName.textContent = account.name || 'Customer';
}

function saveProfileInformation(event) {
  event.preventDefault();

  const currentAccount = window.SmileHubAuth.getCurrentAccount();
  const accounts = window.SmileHubAuth.getAccounts();

  const firstName = document.getElementById('profileFirstName').value.trim();
  const lastName = document.getElementById('profileLastName').value.trim();
  const email = document.getElementById('profileEmail').value.trim().toLowerCase();
  const phone = document.getElementById('profilePhone').value.trim();

  const emailUsedByAnotherAccount = accounts.some(function (account) {
    return account.email.toLowerCase() === email && account.email !== currentAccount.email;
  });

  if (emailUsedByAnotherAccount) {
    showProfileMessage('That email is already used by another account.', true);
    return;
  }

  const accountIndex = accounts.findIndex(function (account) {
    return account.email === currentAccount.email;
  });

  accounts[accountIndex].firstName = firstName;
  accounts[accountIndex].lastName = lastName;
  accounts[accountIndex].name = firstName + ' ' + lastName;
  accounts[accountIndex].email = email;
  accounts[accountIndex].phone = phone;

  window.SmileHubAuth.saveAccounts(accounts);
  window.SmileHubAuth.saveLoggedInUser({
    name: accounts[accountIndex].name,
    email: email,
    role: 'customer'
  });

  document.getElementById('profileName').textContent = accounts[accountIndex].name;
  showProfileMessage('Profile information saved.');
}

function saveAddress(event) {
  event.preventDefault();

  const currentAccount = window.SmileHubAuth.getCurrentAccount();
  const accounts = window.SmileHubAuth.getAccounts();
  const accountIndex = accounts.findIndex(function (account) {
    return account.email === currentAccount.email;
  });

  accounts[accountIndex].address = document.getElementById('profileAddress').value.trim();
  window.SmileHubAuth.saveAccounts(accounts);
  showProfileMessage('Delivery address updated.');
}

function changePassword(event) {
  event.preventDefault();

  const currentAccount = window.SmileHubAuth.getCurrentAccount();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (currentPassword !== currentAccount.password) {
    showProfileMessage('The current password is incorrect.', true);
    return;
  }

  if (newPassword.length < 6) {
    showProfileMessage('The new password must contain at least 6 characters.', true);
    return;
  }

  if (newPassword !== confirmPassword) {
    showProfileMessage('The new passwords do not match.', true);
    return;
  }

  const accounts = window.SmileHubAuth.getAccounts();
  const accountIndex = accounts.findIndex(function (account) {
    return account.email === currentAccount.email;
  });

  accounts[accountIndex].password = newPassword;
  window.SmileHubAuth.saveAccounts(accounts);
  event.target.reset();
  showProfileMessage('Password changed successfully.');
}

function showProfileMessage(message, isError) {
  const messageBox = document.getElementById('profileMessage');
  messageBox.textContent = message;
  messageBox.classList.remove('hidden');
  messageBox.classList.toggle('error', Boolean(isError));
  messageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
