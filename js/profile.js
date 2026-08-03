document.addEventListener('DOMContentLoaded', function () {
  var profileForm = document.getElementById('profileForm');
  var addressForm = document.getElementById('addressForm');
  var passwordForm = document.getElementById('passwordForm');

  if (!profileForm || !window.SmileHubAuth) return;

  loadProfile();
  updatePasswordFieldVisibility();
  firebase.auth().onAuthStateChanged(updatePasswordFieldVisibility);

  profileForm.addEventListener('submit', saveProfileInformation);
  addressForm.addEventListener('submit', saveAddress);
  passwordForm.addEventListener('submit', changePassword);
});

function updatePasswordFieldVisibility() {
  var user = firebase.auth().currentUser;
  var hasPassword = user && (user.providerData || []).some(function(p) {
    return p.providerId === 'password';
  });
  var currentPasswordGroup = document.getElementById('currentPasswordGroup');
  if (currentPasswordGroup) {
    currentPasswordGroup.classList.toggle('hidden', !hasPassword);
  }
}

function loadProfile() {
  var account = window.SmileHubAuth.getCurrentAccount();
  if (!account) return;

  document.getElementById('profileFirstName').value = account.firstName || '';
  document.getElementById('profileLastName').value = account.lastName || '';
  document.getElementById('profileEmail').value = account.email || '';
  document.getElementById('profilePhone').value = account.phone || '';
  document.getElementById('profileAddress').value = account.address || '';

  var profileName = document.getElementById('profileName');
  if (profileName) profileName.textContent = account.name || 'Customer';
}

function saveProfileInformation(event) {
  event.preventDefault();

  var currentAccount = window.SmileHubAuth.getCurrentAccount();
  var firstName = document.getElementById('profileFirstName').value.trim();
  var lastName = document.getElementById('profileLastName').value.trim();
  var email = document.getElementById('profileEmail').value.trim().toLowerCase();
  var phone = document.getElementById('profilePhone').value.trim();
  var user = firebase.auth().currentUser;
  if (!user) return;

  firebase.firestore().collection('users').doc(user.uid).update({
    firstName: firstName,
    lastName: lastName,
    displayName: firstName + ' ' + lastName,
    email: email,
    phone: phone
  }).then(function() {
    var cached = getCachedUser();
    if (cached) {
      cached.firstName = firstName;
      cached.lastName = lastName;
      cached.name = firstName + ' ' + lastName;
      cached.email = email;
      cached.phone = phone;
      cacheUser(cached);
    }
    var nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = firstName + ' ' + lastName;
    showProfileMessage('Profile information saved.');
  }).catch(function(error) {
    showProfileMessage('Error saving profile: ' + error.message, true);
  });
}

function saveAddress(event) {
  event.preventDefault();

  var address = document.getElementById('profileAddress').value.trim();
  var user = firebase.auth().currentUser;
  if (!user) return;

  firebase.firestore().collection('users').doc(user.uid).update({
    address: address
  }).then(function() {
    var cached = getCachedUser();
    if (cached) {
      cached.address = address;
      cacheUser(cached);
    }
    showProfileMessage('Delivery address updated.');
  }).catch(function(error) {
    showProfileMessage('Error saving address: ' + error.message, true);
  });
}

function changePassword(event) {
  event.preventDefault();

  var newPassword = document.getElementById('newPassword').value;
  var confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword.length < 6) {
    showProfileMessage('The new password must contain at least 6 characters.', true);
    return;
  }

  if (newPassword !== confirmPassword) {
    showProfileMessage('The new passwords do not match.', true);
    return;
  }

  var user = firebase.auth().currentUser;
  if (!user) return;

  var hasPassword = (user.providerData || []).some(function(p) {
    return p.providerId === 'password';
  });

  var reauth = hasPassword
    ? user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, document.getElementById('currentPassword').value))
    : Promise.resolve();

  reauth.then(function() {
    return user.updatePassword(newPassword);
  }).then(function() {
    event.target.reset();
    showProfileMessage('Password changed successfully.');
  }).catch(function(error) {
    if (error.code === 'auth/wrong-password') {
      showProfileMessage('The current password is incorrect.', true);
    } else if (error.code === 'auth/requires-recent-login') {
      showProfileMessage('Your session is too old. Sign out and sign in again, then retry.', true);
    } else {
      showProfileMessage('Error: ' + error.message, true);
    }
  });
}

function showProfileMessage(message, isError) {
  var messageBox = document.getElementById('profileMessage');
  messageBox.textContent = message;
  messageBox.classList.remove('hidden');
  messageBox.classList.toggle('error', Boolean(isError));
  messageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}