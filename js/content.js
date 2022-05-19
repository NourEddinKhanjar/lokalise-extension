class PageTranslator {

   constructor() {
      this.endpoint = "http://165.227.164.99:15000/translations";
      this.mousePointing = null;
      this.mousePointingEnabled = true;
      this.translations = {};
      this.url = window.location.href;
      this.urlEncoded = this._base64Encode(this.url);
      this.modal = this._createTranslationModal();
   }

   init() {
      this.translations = {
         ...this.translations,
         ...this._loadTranslations()
      };

      this.modal.appendToBody();

      //this._insecureContentNotification();
      this._loadTranslations();
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

      const translations = JSON.parse(xmlHttp.responseText);
      const translationsMapped = {};

      for (let translation of translations) {
         translationsMapped[translation.htmlSelector] = translation;
      }
      
      return translationsMapped;
   }

   _initMouseOverEvent() {
      document.addEventListener('mouseover', (mouseEnterEvent) => {
         if (!this.mousePointingEnabled)
            return;

         this._resetPointingElementStyle();

         if (mouseEnterEvent.path.length > 4)
            this._setPointingElement(mouseEnterEvent.target);
      });
   }

   _resetPointingElementStyle() {
      if (this.mousePointing && this.mousePointing.lokaliseBackupStyle) {
         this.mousePointing.style = this.mousePointing.lokaliseBackupStyle;
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
      element.lokaliseBackupStyle = Object.assign({}, element.style);
      
      this.mousePointing = element;
      this.mousePointing.style.backgroundColor = 'rgba(255,255,0,0.5)';
   }

   _initMouseOnClick() {
      document.addEventListener('click', (clickEvent) => {
         clickEvent.preventDefault();

         if (!this.mousePointing)
            return;

         const path = this._getElementPath(this.mousePointing).join(' > ');

         this.modal.show(
            this.mousePointing,
            this.mousePointing.innerHTML,
            this.translations[path] ? this.translations[path].targetTranslation : "",
            path
         );

         this._disableMousePointing();

         return false;
      });
   }

   _createTranslationModal() {
      const modal =  {
         overlay: jQuery('<div style="display:block;position:fixed;z-index:99998;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.2)"></div>'),
         container: jQuery(`
            <div style="display:block;position:absolute;z-index:99999;top:0;left:0;width:400px;box-sizing:border-box;padding:10px 15px;background-color: white;border-radius: 5px;box-shadow: 0 5px 5px rgba(0,0,0,0.2);">
               <form style="display:block;">
                  <label for="lokaliseTanslatorTranslation" style="display:block;font-weight:600;">Translation</label>
                  <textarea name="targetTranslation" id="lokaliseTanslatorTranslation" style="width:100%;height:100px;margin-bottom: 10px;border: solid #ddd 1px;border-radius: 3px;padding: 10px;box-sizing: border-box;"></textarea>
                  <button type="submit" style="background-color: forestgreen;border: none;padding: 10px;border-radius: 3px;color: white;width:100%;text-align:center;">Save</button>
                  <input type="hidden" name="baseTranslation" value="" />
                  <input type="hidden" name="path" value="" />
               </form>
            </div>
         `),
         appendToBody: function () {
            jQuery("body").append(this.overlay).append(this.container);
         },
         show: function (centerBy, baseTranslation, targetTranslation, path) {
            this.overlay.show();
            this.container.show();

            this.container.find('textarea[name=targetTranslation]').val(targetTranslation ?? "");
            this.container.find('input[name=baseTranslation]').val(baseTranslation ?? "");
            this.container.find('input[name=path]').val(path ?? "");

            if (centerBy)
               this.positionContainer(jQuery(centerBy));
         },
         hide: function () {
            this.overlay.hide();
            this.container.hide();
         },
         positionContainer: function (centerBy) {
            let centerByOffset = centerBy.offset();
            let centerByWidth = centerBy.outerWidth();
            let containerHeight = this.container.outerHeight();
            let containerWidth = this.container.outerWidth();

            this.container.css({
               top: centerByOffset.top - containerHeight - 10,
               left: centerByOffset.left + (centerByWidth / 2) - (containerWidth / 2)
            });
         }
      };

      modal.overlay.on('click', () => {
         modal.hide();
         this._enableMousePointing();
      });

      modal.container.find('form').on('submit', (submitEvent) => {
         submitEvent.preventDefault();
         
         this._postTranslation(
            modal.container.find('input[name=path]').val(),
            modal.container.find('input[name=baseTranslation]').val(),
            modal.container.find('textarea[name=targetTranslation]').val(),
         ).then((response) => {
            modal.hide();
         }).catch((error) => {
            modal.hide();
            console.error(error);
         });

         return false;
      });

      modal.hide();

      return modal;
   }

   _postTranslation(htmlSelector, baseTranslation, targetTranslation) {
      return new Promise((resolve, reject) => {
         const data = {
            url: this.url,
            htmlSelector: htmlSelector,
            baseTranslation: baseTranslation,
            targetTranslation: targetTranslation
         };

         jQuery.ajax({
            method: "POST",
            url: this.endpoint,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(data),
            success: (response) => {
               this.translations[htmlSelector] = data;
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

(new PageTranslator()).init();