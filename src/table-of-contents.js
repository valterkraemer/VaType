(function() {

  Tasks.set('registerHeadings', 2000, function registerHeadings() {
    return new Promise(function(resolve, reject) {

      var h1 = 0;
      var h2 = 0;
      var h3 = 0;
      var h4 = 0;
      var h5 = 0;
      var h6 = 0;

      Tasks.data.headings = [];

      var query = 'h1:not([ignore]), h2:not([ignore]), h3:not([ignore]), h4:not([ignore]), h5:not([ignore])';

      var hs = document.querySelectorAll(query);

      for (var i = 0; i < hs.length; i++) {

        var chapter = '';

        switch(hs[i].nodeName) {
          case 'H1':
          h2 = 0;
          /* falls through */
          case 'H2':
          h3 = 0;
          /* falls through */
          case 'H3':
          h4 = 0;
          /* falls through */
          case 'H4':
          h5 = 0;
        }

        switch(hs[i].nodeName) {
          case 'H1':
          chapter = `${++h1}`;
          break;
          case 'H2':
          chapter = `${h1}.${++h2}`;
          break;
          case 'H3':
          chapter = `${h1}.${h2}.${++h3}`;
          break;
          case 'H4':
          chapter = `${h1}.${h2}.${h3}.${++h4}`;
          break;
          case 'H5':
          chapter = `${h1}.${h2}.${h3}.${h4}.${++h5}`;
        }

        Tasks.data.headings.push({
          chapter: chapter,
          text: hs[i].innerHTML,
          importance: hs[i].nodeName,
          element: hs[i]
        });

        var a = document.createElement('a');
        a.setAttribute('name', chapter);
        a.setAttribute('class', 'grid');

        var span = document.createElement('span');
        span.setAttribute('class', 'chapter cell-0');
        span.innerHTML = chapter;
        a.appendChild(span);

        span = document.createElement('span');
        span.setAttribute('class', 'cell');
        span.innerHTML = hs[i].innerHTML;
        a.appendChild(span);

        hs[i].className += 'heading';
        hs[i].innerHTML = a.outerHTML;
      }

      return resolve();
    });
  });

  Tasks.set('tableOfContents', 2001, function tableOfContents() {
    return new Promise(function(resolve, reject) {

      var element = document.querySelector('table-of-contents');

      if (element) {

        // Temporary container for all headings
        var toc = document.createElement('div');

        Tasks.data.headings.forEach(function(item) {
          var heading = document.createElement('a');
          heading.href = '#' + item.chapter;
          heading.className += 'toc-heading grid ' + item.importance;
          toc.appendChild(heading);
          
          var chapter = createDiv('toc-chapter cell-0', item.chapter);
          heading.appendChild(chapter);

          var text = createDiv('toc-text cell-0', item.text);
          heading.appendChild(text);

          var dotted = createDiv('cell ' + (item.importance === 'H1' ? '' : 'toc-dotted'));
          heading.appendChild(dotted);

          var pageNumber = createDiv('toc-page-number cell-0', '-');
          heading.appendChild(pageNumber);
        });

        element.outerHTML = toc.innerHTML;
      }

      function createDiv(cl, innerHTML) {
        var div = document.createElement('div');
        div.className += cl || '';
        div.innerHTML = innerHTML || '';
        return div;
      }

      return resolve();
    });
  });

  Tasks.set('tableOfContentsPageNumbers', 5000, function tableOfContentsPageNumbers () {
    return new Promise(function(resolve, reject) {

      var pages = document.querySelectorAll('body > .page');

      for (var i = 0; i < pages.length; i++) {
        var as = pages[i].querySelectorAll('h1 > a, h2 > a, h3 > a, h4 > a, h5 > a');

        for (var j = 0; j < as.length; j++) {
          var name = as[j].getAttribute('name');
          var query = `[href="#${name}"].toc-heading > .toc-page-number`;
          var el = document.querySelector(query).innerHTML = pages[i].pageNumber;
        }
      }

      return resolve();
    });
  });
})();
