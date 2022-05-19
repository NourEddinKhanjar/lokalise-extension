function init() {
   window.addEventListener('mouseup', function () {
      const selection = window.getSelection();
      if(!selection.toString().length) {
         return;
      }

      debugger;
   });
}

init();