window.SmileHubOrderApi = {
  request: async function(action, payload) {
    var user = firebase.auth().currentUser;
    if (!user) throw new Error('Sign in to continue.');
    var response = await fetch('/api/payments/' + action, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() },
      body: JSON.stringify(payload)
    });
    var data;
    try { data = await response.json(); } catch (_) { throw new Error('Order service is unavailable. Please retry.'); }
    if (!response.ok) { var error = new Error(data.error || 'The order could not be updated.'); error.status = response.status; throw error; }
    return data;
  }
};
