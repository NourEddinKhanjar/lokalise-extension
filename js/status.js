
function initExtensionStatusChange() {
    document.addEventListener('extension-enable-status-changed', function(event) {
        // alert(`Extension is ${detail.isEnabled}`);
        alert('Event');
    });
}

initExtensionStatusChange();

