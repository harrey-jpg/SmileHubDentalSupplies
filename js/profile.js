
(function () {
  'use strict';
  var currentProfile = null;
  var pendingProfilePhoto = null;

  function photoCacheKey(uid) { return 'smilehub_profile_photo_' + uid; }
  function cacheProfilePhoto(uid, dataUrl) {
    try {
      if (!uid) return;
      if (dataUrl) localStorage.setItem(photoCacheKey(uid), dataUrl);
      else localStorage.removeItem(photoCacheKey(uid));
    } catch (_) {}
  }
  function cachedProfilePhoto(uid) {
    try { return uid ? (localStorage.getItem(photoCacheKey(uid)) || '') : ''; }
    catch (_) { return ''; }
  }
  var profileLocationCoords = null;

  function el(id) { return document.getElementById(id); }
  function value(id) { return el(id) ? el(id).value.trim() : ''; }
  function setValue(id, v) { if (el(id)) el(id).value = v || ''; }

  function showProfileMessage(message, isError) {
    var box = el('profileMessage');
    if (!box) return;
    box.textContent = message;
    box.classList.remove('hidden');
    box.classList.toggle('error', Boolean(isError));
  }
  window.showProfileMessage = showProfileMessage;

  function normalizePhone(raw) {
    var formatted = window.SmileHubPhone ? window.SmileHubPhone.format(raw) : String(raw || '').trim();
    if (!/^\+639\d{9}$/.test(formatted)) return '';
    return '0' + formatted.slice(3);
  }

  function normalizePhoneE164(raw) {
    var formatted = window.SmileHubPhone ? window.SmileHubPhone.format(raw) : String(raw || '').trim();
    return /^\+639\d{9}$/.test(formatted) ? formatted : '';
  }


  function setProfileMap(lat, lng) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
    lat = Number(lat); lng = Number(lng);
    profileLocationCoords = { lat: lat, lng: lng };
    var frame = el('profileAddressMapFrame');
    var openMaps = el('profileOpenMaps');
    if (frame) {
      var d = 0.01;
      frame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        encodeURIComponent((lng-d)+','+(lat-d)+','+(lng+d)+','+(lat+d)) +
        '&layer=mapnik&marker=' + encodeURIComponent(lat+','+lng);
    }
    if (openMaps) openMaps.href = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng);
  }

  function firstAddressPart(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (obj && obj[keys[i]]) return obj[keys[i]];
    }
    return '';
  }

  function reverseGeocodeProfile(lat, lng) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=' +
      encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng);
    return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (response) {
      if (!response.ok) throw new Error('Address lookup failed');
      return response.json();
    });
  }

  function useProfileCurrentLocation() {
    var button = el('profileUseCurrentLocation');
    var status = el('profileAddressMapStatus');
    if (!navigator.geolocation) {
      if (status) status.textContent = 'Location is not supported by this browser.';
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = 'Finding address…';
    }
    if (status) status.textContent = 'Getting your current location and address…';

    navigator.geolocation.getCurrentPosition(function (position) {
      var lat = position.coords.latitude;
      var lng = position.coords.longitude;
      setProfileMap(lat, lng);

      reverseGeocodeProfile(lat, lng).then(function (result) {
        var a = result.address || {};
        var house = firstAddressPart(a, ['house_number']);
        var road = firstAddressPart(a, ['road','pedestrian','footway','residential','path']);
        var barangay = firstAddressPart(a, ['quarter','suburb','neighbourhood','village']);
        var city = firstAddressPart(a, ['city','town','municipality','city_district','county']);
        var province = firstAddressPart(a, ['state','region']);
        var postal = firstAddressPart(a, ['postcode']);

        if (house || road) setValue('profileAddress', [house, road].filter(Boolean).join(' '));
        else if (result.display_name) setValue('profileAddress', result.display_name);
        if (barangay) setValue('profileBarangay', barangay);
        if (city) setValue('profileCity', city);
        if (province) setValue('profileProvince', province);
        if (postal) setValue('profilePostal', String(postal).replace(/\D/g, '').slice(0, 4));

        if (status) status.textContent = 'Address details were filled from your current location. Please review and edit anything that is incomplete.';
      }).catch(function () {
        if (status) status.textContent = 'Location found and pinned, but some address details could not be looked up. Please complete them manually.';
      }).finally(function () {
        if (button) {
          button.disabled = false;
          button.textContent = '📍 Use current location';
        }
      });
    }, function (error) {
      if (status) status.textContent = error && error.code === 1
        ? 'Location permission was denied. Allow location access in your browser and try again.'
        : 'Could not get your current location. You can still enter the address manually.';
      if (button) {
        button.disabled = false;
        button.textContent = '📍 Use current location';
      }
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function fillProfile(data, user) {
    data = data || {};
    currentProfile = data;
    setValue('profileFirstName', data.firstName);
    setValue('profileLastName', data.lastName);
    setValue('profileEmail', data.email || (user && user.email));
    if (window.SmileHubPhone) {
      window.SmileHubPhone.setValue('profilePhone', data.phoneE164 || data.phone || data.phoneLocal || '');
      window.SmileHubPhone.setValue('verifyPhoneInput', data.phoneE164 || data.phone || data.phoneLocal || '');
    } else {
      setValue('profilePhone', data.phoneE164 || data.phone || data.phoneLocal || '');
      setValue('verifyPhoneInput', data.phoneE164 || data.phone || data.phoneLocal || '');
    }
    setValue('profileBirthday', data.birthday || '');
    setValue('profileAddress', data.address && data.address.street ? data.address.street : (typeof data.address === 'string' ? data.address : ''));
    setValue('profileBarangay', data.address && data.address.barangay);
    setValue('profileCity', data.address && data.address.city);
    setValue('profileProvince', data.address && data.address.province);
    setValue('profilePostal', data.address && data.address.postal);
    setValue('profileDeliveryNotes', data.address && data.address.deliveryNotes);
    if (data.address && data.address.latitude != null && data.address.longitude != null) setProfileMap(data.address.latitude, data.address.longitude);
    if (el('profileDefaultAddress')) el('profileDefaultAddress').checked = data.address ? data.address.isDefault !== false : true;
    var name = [data.firstName, data.lastName].filter(Boolean).join(' ') || data.displayName || (user && user.displayName) || 'Customer';
    if (el('profileName')) el('profileName').textContent = name;
    if (el('profileEmailSummary')) el('profileEmailSummary').textContent = data.email || (user && user.email) || '';
    var photo = data.photoDataUrl || data.photoURL || cachedProfilePhoto(user && user.uid) || (user && user.photoURL) || 'assets/profile-placeholder.svg';
    if (el('profilePhoto')) el('profilePhoto').src = photo;
    if (el('removeProfilePhoto')) el('removeProfilePhoto').classList.toggle('hidden', photo.indexOf('profile-placeholder.svg') > -1);
    updatePhoneStatus(Boolean(data.phoneVerified), data.phoneE164 || '');
  }

  function updatePhoneStatus(verified, phone) {
    var inlineStatus = el('profilePhoneStatus');
    var cardStatus = el('verificationPhoneStatus');
    var label = verified ? '✓ Verified' + (phone ? ' (' + phone + ')' : '') : '● Not verified';
    if (inlineStatus) {
      inlineStatus.className = 'phone-status ' + (verified ? 'verified' : 'unverified');
      inlineStatus.textContent = label;
    }
    if (cardStatus) {
      cardStatus.className = 'verification-badge ' + (verified ? 'is-verified' : 'is-pending');
      cardStatus.textContent = verified ? '✓ Phone verified' : 'Not verified';
    }
    var sendButton = el('sendOtpButton');
    if (sendButton) sendButton.hidden = Boolean(verified);
  }
  window.SmileHubProfileUI = { updatePhoneStatus: updatePhoneStatus, reload: loadProfile };

  function loadProfile() {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) return;
      firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
        fillProfile(doc.exists ? doc.data() : {}, user);
      }).catch(function () {
        var cached = window.SmileHubAuth && window.SmileHubAuth.getCurrentAccount();
        fillProfile(cached || {}, user);
      });
    });
  }

  function saveProfileInformation(event) {
    event.preventDefault();
    var user = firebase.auth().currentUser;
    if (!user) return showProfileMessage('Please sign in again.', true);
    var phoneE164 = normalizePhoneE164(value('profilePhone'));
    var phoneLocal = normalizePhone(phoneE164);
    if (value('profilePhone') && value('profilePhone') !== '+63' && !phoneE164) {
      return showProfileMessage('Enter a valid 10-digit Philippine mobile number beginning with 9.', true);
    }
    var verifiedPhone = currentProfile && currentProfile.phoneVerified ? normalizePhone(currentProfile.phoneLocal || currentProfile.phone) : '';
    var phoneChanged = phoneLocal !== verifiedPhone;
    var data = {
      firstName: value('profileFirstName'),
      lastName: value('profileLastName'),
      displayName: [value('profileFirstName'), value('profileLastName')].filter(Boolean).join(' '),
      email: user.email || value('profileEmail'),
      birthday: value('profileBirthday'),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (pendingProfilePhoto !== null) data.photoDataUrl = pendingProfilePhoto;
    if (phoneChanged) {
      data.phone = phoneE164;
      data.phoneLocal = phoneLocal;
      data.phoneVerified = false;
      data.phoneE164 = phoneE164;
    }
    firebase.firestore().collection('users').doc(user.uid).set(data, { merge: true }).then(function () {
      currentProfile = Object.assign({}, currentProfile || {}, data);
      if (pendingProfilePhoto !== null) cacheProfilePhoto(user.uid, pendingProfilePhoto);
      pendingProfilePhoto = null;
      if (phoneChanged) updatePhoneStatus(false, '');
      setSaveState('Saved');
      showProfileMessage(phoneChanged ? 'Profile saved. Verify your new phone number before checkout.' : 'Profile information saved.');
    }).catch(function (error) {
      setSaveState('Save failed', true);
      showProfileMessage('Could not save profile: ' + error.message, true);
    });
  }

  function saveAddress(event) {
    event.preventDefault();
    var user = firebase.auth().currentUser;
    if (!user) return showProfileMessage('Please sign in again.', true);
    var postal = value('profilePostal');
    if (!/^\d{4}$/.test(postal)) return showProfileMessage('Postal code must contain exactly 4 digits.', true);
    var address = {
      street: value('profileAddress'),
      barangay: value('profileBarangay'),
      city: value('profileCity'),
      province: value('profileProvince'),
      postal: postal,
      deliveryNotes: value('profileDeliveryNotes'),
      isDefault: el('profileDefaultAddress') ? el('profileDefaultAddress').checked : true,
      latitude: profileLocationCoords ? profileLocationCoords.lat : null,
      longitude: profileLocationCoords ? profileLocationCoords.lng : null
    };
    if (!address.street || !address.barangay || !address.city || !address.province) {
      return showProfileMessage('Please complete all required address fields.', true);
    }
    firebase.firestore().collection('users').doc(user.uid).set({
      address: address,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function () {
      currentProfile = Object.assign({}, currentProfile || {}, { address: address });
      showProfileMessage('Default delivery address saved. It will be used automatically at checkout.');
    }).catch(function (error) {
      showProfileMessage('Could not save address: ' + error.message, true);
    });
  }

  function changePassword(event) {
    event.preventDefault();
    var newPassword = value('newPassword');
    var confirmPassword = value('confirmPassword');
    if (newPassword.length < 6) return showProfileMessage('The new password must contain at least 6 characters.', true);
    if (newPassword !== confirmPassword) return showProfileMessage('The new passwords do not match.', true);
    var user = firebase.auth().currentUser;
    if (!user || !user.email) return showProfileMessage('Password changes are available for signed-in email accounts.', true);
    var hasPassword = (user.providerData || []).some(function (p) {
      return p.providerId === 'password';
    });
    var reauth = hasPassword
      ? user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, value('currentPassword')))
      : Promise.resolve();
    reauth.then(function () {
      return user.updatePassword(newPassword);
    }).then(function () {
      event.target.reset();
      showProfileMessage('Password changed successfully.');
    }).catch(function (error) {
      if (error.code === 'auth/wrong-password') {
        showProfileMessage('The current password is incorrect.', true);
      } else if (error.code === 'auth/requires-recent-login') {
        showProfileMessage('Your session is too old. Sign out and sign in again, then retry.', true);
      } else {
        showProfileMessage('Could not change password: ' + error.message, true);
      }
    });
  }

  function updatePasswordFieldVisibility() {
    var user = firebase.auth().currentUser;
    var hasPassword = user && (user.providerData || []).some(function (p) {
      return p.providerId === 'password';
    });
    var group = el('currentPasswordGroup');
    if (group) group.classList.toggle('hidden', !hasPassword);
    var currentPassword = el('currentPassword');
    if (currentPassword) {
      if (hasPassword) currentPassword.setAttribute('required', 'required');
      else currentPassword.removeAttribute('required');
    }
  }


  function setSaveState(text, error) {
    var node = el('profileSaveState');
    if (!node) return;
    node.textContent = text || '';
    node.style.color = error ? '#b42318' : '';
  }

  function resizeProfileImage(file) {
    return new Promise(function(resolve, reject) {
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Choose a JPG, PNG, or WebP image.'));
      if (file.size > 8 * 1024 * 1024) return reject(new Error('Image must be smaller than 8 MB.'));
      var reader = new FileReader();
      reader.onerror = function() { reject(new Error('Could not read the selected image.')); };
      reader.onload = function() {
        var img = new Image();
        img.onerror = function() { reject(new Error('The selected file is not a valid image.')); };
        img.onload = function() {
          var size = 360;
          var canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          var scale = Math.max(size / img.width, size / img.height);
          var width = img.width * scale, height = img.height * scale;
          ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
          resolve(canvas.toDataURL('image/jpeg', .82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleProfilePhoto(file) {
    setSaveState('Preparing photo…');
    resizeProfileImage(file).then(function(dataUrl) {
      var user = firebase.auth().currentUser;
      if (!user) throw new Error('Please sign in again.');
      pendingProfilePhoto = dataUrl;
      if (el('profilePhoto')) el('profilePhoto').src = dataUrl;
      if (el('removeProfilePhoto')) el('removeProfilePhoto').classList.remove('hidden');
      cacheProfilePhoto(user.uid, dataUrl);
      return firebase.firestore().collection('users').doc(user.uid).set({
        photoDataUrl: dataUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }).then(function() {
      pendingProfilePhoto = null;
      setSaveState('Photo saved');
      showProfileMessage('Profile photo updated.');
    }).catch(function(error) {
      setSaveState(error.message, true);
      showProfileMessage(error.message, true);
    });
  }


  function loadNotificationSettings() {
    var prefs = window.getNotificationPreferences ? window.getNotificationPreferences() : { importantOnly: true, orderUpdates: true };
    if (el('importantAlertsOnly')) el('importantAlertsOnly').checked = prefs.importantOnly !== false;
    if (el('orderNotifications')) el('orderNotifications').checked = prefs.orderUpdates !== false;
  }

  function saveNotificationSettings() {
    var prefs = {
      importantOnly: el('importantAlertsOnly') ? el('importantAlertsOnly').checked : true,
      orderUpdates: el('orderNotifications') ? el('orderNotifications').checked : true,
      cart: false,
      wishlist: false,
      routine: false
    };
    if (window.SmileHubStorage) window.SmileHubStorage.set('smilehub_notification_preferences', prefs);
    showProfileMessage('Notification settings saved. Routine clicks will stay quiet.');
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadNotificationSettings();

    var profilePhoneField = el('profilePhone');
    var verifyPhoneField = el('verifyPhoneInput');
    if (profilePhoneField && verifyPhoneField) {
      function syncPhone(source, target) {
        if (!window.SmileHubPhone) return;
        var digits = window.SmileHubPhone.subscriberDigits(source.value);
        if (target.value !== digits) target.value = digits;
      }
      profilePhoneField.addEventListener('phphonechange', function () { syncPhone(profilePhoneField, verifyPhoneField); });
      verifyPhoneField.addEventListener('phphonechange', function () { syncPhone(verifyPhoneField, profilePhoneField); });
    }

    var notificationButton = el('saveNotificationSettings');
    if (notificationButton) notificationButton.addEventListener('click', saveNotificationSettings);
    var profileForm = el('profileForm');
    if (!profileForm || !window.firebase) return;
    profileForm.addEventListener('submit', function(event) {
      setSaveState('Saving…');
      saveProfileInformation(event);
    });
    var picker = el('profileImageInput');
    if (picker) picker.addEventListener('change', function() { if (this.files && this.files[0]) handleProfilePhoto(this.files[0]); });
    if (el('chooseProfilePhoto')) el('chooseProfilePhoto').addEventListener('click', function() { if (picker) picker.click(); });
    if (el('removeProfilePhoto')) el('removeProfilePhoto').addEventListener('click', function() {
      var user = firebase.auth().currentUser;
      pendingProfilePhoto = '';
      if (el('profilePhoto')) el('profilePhoto').src = 'assets/profile-placeholder.svg';
      this.classList.add('hidden');
      if (user) {
        cacheProfilePhoto(user.uid, '');
        firebase.firestore().collection('users').doc(user.uid).set({
          photoDataUrl: '',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
          pendingProfilePhoto = null;
          setSaveState('Photo removed');
        }).catch(function(error) {
          setSaveState('Could not remove photo: ' + error.message, true);
        });
      }
    });
    if (el('addressForm')) el('addressForm').addEventListener('submit', saveAddress);
    if (el('profileUseCurrentLocation')) el('profileUseCurrentLocation').addEventListener('click', useProfileCurrentLocation);
    if (el('passwordForm')) el('passwordForm').addEventListener('submit', changePassword);
    loadProfile();
    updatePasswordFieldVisibility();
    firebase.auth().onAuthStateChanged(updatePasswordFieldVisibility);
  });
})();
