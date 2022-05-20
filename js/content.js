class PageTranslator {

   constructor(livePreview) {
      this.endpoint = "http://165.227.164.99:15000/translations";
      this.mousePointing = null;
      this.mousePointingEnabled = true;
      this.translations = {};
      this.url = window.location.href;
      this.urlEncoded = this._base64Encode(this.url);
      this.modal = this._createTranslationModal();
      this.livePreview = livePreview;
   }

   init() {
      for (let translation of Object.values(this._loadTranslations()))
         this._insertTranslation(translation);

      this.modal.appendToBody();

      //this._insecureContentNotification();
      this._initMouseOverEvent();
      this._initMouseOnClick();
   }

   _base64Encode(text) {
      return window.btoa(text);
   }

   _insecureContentNotification() {
      alert('Extension is loading http request, please allow this site to use insecure content requests.');
   }

   _loadTranslations() {
      const xmlHttp = new XMLHttpRequest();

      xmlHttp.open('GET', this.endpoint + '?url='+ this.urlEncoded, false);
      xmlHttp.send(null);

      return JSON.parse(xmlHttp.responseText);
   }

   _insertTranslation(translation) {
      this.translations[translation.htmlSelector] = translation;

      const translationElement = jQuery(translation.htmlSelector);

      if (this.livePreview)
         translationElement.html(translation.targetTranslation);

      translationElement.css('background-color', 'rgba(0,0,0,0.1)');
   }

   _initMouseOverEvent() {
      document.onmouseover = (mouseEnterEvent) => {
         if (!this.mousePointingEnabled)
            return;

         this._resetPointingElementStyle();

         if (mouseEnterEvent.target === this.modal.editingNotification.get(0))
            return;

         if (mouseEnterEvent.path.length > 4)
            this._setPointingElement(mouseEnterEvent.target);
      };
   }

   _resetPointingElementStyle() {
      if (this.mousePointing && this.mousePointing.lokaliseBackupStyle) {
         jQuery(this.mousePointing).css('background-color', this.mousePointing.lokaliseBackupStyle);
         delete this.mousePointing.lokaliseBackupStyle;
         this.mousePointing = null;
      }
   }

   _disableMousePointing() {
      this.mousePointingEnabled = false;
      this._resetPointingElementStyle();
   }

   _enableMousePointing() {
      this.mousePointingEnabled = true;
   }

   _setPointingElement(element) {
      element.lokaliseBackupStyle = jQuery(element).css('background-color');
      this.mousePointing = element;
      this.mousePointing.style.backgroundColor = 'rgba(255,255,0,0.5)';
   }

   _initMouseOnClick() {
      document.onclick = (clickEvent) => {
         if (!this.mousePointing)
            return;

         clickEvent.preventDefault();

         const path = this._getElementPath(this.mousePointing).join(' > ');
         const baseTranslation = this.mousePointing.innerHTML.trim();
         const targetTranslation = this.translations[path] ? this.translations[path].targetTranslation : baseTranslation;

         this.modal.show(
             this.mousePointing,
             baseTranslation,
             targetTranslation,
             path,
             this.translations[path] ? this.translations[path].isGlobal === 1 : false
         );

         this._disableMousePointing();

         return false;
      };
   }

   _createTranslationModal() {
      const modal =  {
         overlay: jQuery('<div class="lokalise-translator-overlay"></div>'),
         editingNotification: jQuery('<div class="lokalise-translator-editing-notification">Lokalise editor is now active.</div>'),
         container: jQuery(`
            <div class="lokalise-translator-container">
               <a href="javascript:void(0);" class="lokalise-translator-close"></a>
               <form style="">
                  <label for="lokaliseTanslatorTranslation" style="">Lokalise Translation</label>
                  <textarea name="targetTranslation" id="lokaliseTanslatorTranslation"></textarea>
                  <label class="lokalise-checkbox">
                    <input type="checkbox" name="isGlobal" value="1">
                    <span class="checkbox"></span>
                    <span class="text">Global for this domain</span>
                  </label>
                  <button type="submit">Save</button>
                  <input type="hidden" name="baseTranslation" value="" />
                  <input type="hidden" name="path" value="" />
               </form>
            </div>
         `),
         appendToBody: function () {
            jQuery("body")
                .append(this.overlay)
                .append(this.editingNotification)
                .append(this.container);
         },
         destroy: function () {
            this.overlay.remove();
            this.container.remove();
         },
         show: function (centerBy, baseTranslation, targetTranslation, path, isGlobal) {
            this.overlay.show();
            this.container.show();

            this.container.find('textarea[name=targetTranslation]').val(targetTranslation ?? "");
            this.container.find('input[name=baseTranslation]').val(baseTranslation ?? "");
            this.container.find('input[name=path]').val(path ?? "");

            if (isGlobal)
               this.container.find('input[name=isGlobal]').attr("checked", "checked").prop("checked", true);
            else
               this.container.find('input[name=isGlobal]').removeAttr("checked").prop("checked", false);

            if (centerBy)
               this.positionContainer(jQuery(centerBy));
         },
         hide: function () {
            this.overlay.hide();
            this.container.hide();
         },
         positionContainer: function (centerBy) {
            const centerByOffset = centerBy.offset();
            const centerByWidth = centerBy.outerWidth();
            const containerHeight = this.container.outerHeight();
            const containerWidth = this.container.outerWidth();

            let calculateTop = centerByOffset.top - containerHeight - 10;
            if (calculateTop < 0)
               calculateTop = 10;

            let calculateLeft = centerByOffset.left + (centerByWidth / 2) - (containerWidth / 2);
            if (calculateLeft < 0)
               calculateLeft = 10;

            if (calculateLeft + containerWidth > jQuery(window).width())
               calculateLeft = jQuery(window).width() - containerWidth - 10;

            this.container.css({
               top: calculateTop,
               left: calculateLeft
            });
         }
      };

      modal.overlay.on('click', () => {
         modal.hide();
         this._enableMousePointing();
      });

      modal.container.find('a.lokalise-translator-close').on('click', () => {
         modal.hide();
         this._enableMousePointing();
      })

      const form = modal.container.find('form');
      const submitButton = form.find('button[type=submit]');
      form.on('submit', (submitEvent) => {
         submitEvent.preventDefault();

         submitButton.attr("disabled", "disabled").text("Saving...");
         
         this._postTranslation(
            modal.container.find('input[name=path]').val(),
            modal.container.find('input[name=baseTranslation]').val(),
            modal.container.find('textarea[name=targetTranslation]').val(),
            modal.container.find('input[name=isGlobal]').is(":checked")
         ).then((response) => {
            modal.hide();
            this._enableMousePointing();
         }).catch((error) => {
            console.error(error);
            modal.hide();
            this._enableMousePointing();
         }).finally(() => {
            submitButton.removeAttr("disabled").text("Save");
         });

         return false;
      });

      modal.hide();

      return modal;
   }

   _postTranslation(htmlSelector, baseTranslation, targetTranslation, isGlobal) {
      return new Promise((resolve, reject) => {
         const data = {
            url: this.url,
            htmlSelector: htmlSelector,
            baseTranslation: baseTranslation,
            targetTranslation: targetTranslation,
            isGlobal: isGlobal === true ? 1 : 0
         };

         jQuery.ajax({
            method: "POST",
            url: this.endpoint,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(data),
            success: (response) => {
               this.translations[htmlSelector] = data;
               this._insertTranslation(data);
               resolve(response);
            },
            error: (xhr, response) => {
               reject(response);
            }
         });
      });
   }

   _getElementPath(element) {
      const stack = [];

      while ( element.parentNode != null ) {
         let sibCount = 0;
         let sibIndex = 0;

         for (let i = 0; i < element.parentNode.childNodes.length; i++) {
            let sib = element.parentNode.childNodes[i];

            if (sib.nodeName == element.nodeName) {
               if (sib === element)
                  sibIndex = sibCount;

               sibCount++;
            }
         }

         if (element.hasAttribute('id') && element.id != '') {
            stack.unshift(element.nodeName.toLowerCase() + '#' + element.id);
         } else if (sibCount > 1) {
            stack.unshift(element.nodeName.toLowerCase() + ':eq(' + sibIndex + ')');
         } else {
            stack.unshift(element.nodeName.toLowerCase());
         }

         element = element.parentNode;
      }

      return stack.slice(1);
   }

}

chrome.storage.sync.get("lokaliseSettings", ({ lokaliseSettings }) => {
   const settings = lokaliseSettings[getWebsiteUrl()];
   if (settings?.enabled) {
      const pageTranslator = new PageTranslator(settings?.livePreview);
      pageTranslator.init();
   }
});

function getWebsiteUrl() {
   return window.btoa(window.location.href.split('//')[1].split('/')[0]);
}