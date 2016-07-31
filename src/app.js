(function() {

  var items = {};

  window.Tasks = {
    set: set,
    remove: remove,
    setPriority: setPriority,
    getTasks: getTasks,
    data: {}
  };

  window.onload = onload;

  // FUNCTIONS

  function set(name, priority, func) {
    if (!validName(name) ||  !validPriority(priority) || !validFunction(func)) {
      return;
    }
    items[name] = {
      priority: priority,
      func: func
    };
  }

  function remove(name) {
    if (!validName(name) ||  !hasName(name)) {
      return;
    }
    delete items[name];
  }

  function setPriority(name, priority) {
    if (!items[name] || !validPriority(priority)) {
      return;
    }
    items[name].priority = priority;
  }

  function getTasks() {
    return Object.keys(items).map(function(key) {
      return {
        priority: items[key].priority,
        name: key,
        data: items[key].data
      };
    }).sort(function(a, b) {
      return a.priority - b.priority;
    });
  }

  function onload() {

    var tasks = [];

    Object.keys(items).map(function(key) {
      return items[key];
    })
      // Order tasks into priority order
      .sort(function(a, b) {
        return a.priority - b.priority;
      })
      // Run tasks synchronous
      .reduce(function(p, f) {
        return p.then(function(data) {
          f.data = data;
          return f.func();
        });
      }, Promise.resolve())
      .then(function() {
        console.log('Ready');
      })
      .catch(function(err) {
        console.error(err);
      });
    }

  // HELPER

  function validName(name) {
    if (!name) {
      console.warning('No task name specified');
    }
    return !!name;
  }

  function hasName(name) {
    if (!items[name]) {
      console.warning('No task with name: "' + name + '"');
    }
    return !!items[name];
  }

  function validPriority(priority) {
    if (!Number.isInteger(priority)) {
      console.warning('Priority: "' + priority + '" is not an integer');
    }
    return Number.isInteger(priority);
  }

  function validFunction(func) {
    if (typeof func !== 'function') {
      console.warning('Not an function: ' + func);
    }
    return typeof func === 'function';
  }

})();

Tasks.set('hideBody', 1, function hideBody() {
  document.body.style.opacity = '0';
});

Tasks.set('showBody', 10000, function hideBody() {
  document.body.style.opacity = '1';
});

Tasks.set('importHTML', 1000, function importHTML() {

  var elements = document.body.querySelectorAll('link[rel=import]');

  for (var i = 0; i < elements.length; i++) {
    if (elements[i].href.endsWith('.html')) {
      var content = elements[i].import.querySelector('body');
      var imported = document.importNode(content, true);
      elements[i].outerHTML = imported.innerHTML;
    }
  }
});

Tasks.set('importBib', 1001, function importBib() {

  var elements = document.head.querySelectorAll('link[rel=import]');
  for (var i = 0; i < elements.length; i++) {
    if (elements[i].href.endsWith('.bib')) {
      var content = elements[i].import.querySelector('body').innerHTML;
      Tasks.data.bib = Tasks.data.bib || [];
      Tasks.data.bib = Tasks.data.bib.concat(bibtexParse.toJSON(content));
    }
  }
});

Tasks.set('citations', 1003, function citations() {

  var cites = document.body.querySelectorAll('cite, citep');

  var bib = Tasks.data.bib;

  for (var i = 0; i < cites.length; i++) {
    /*jshint loopfunc: true */
    var results = bib.filter(function(item) {
      return item.citationKey === cites[i].innerHTML;
    });
    /*jshint loopfunc: false */

    if (results.length === 0) {
      cites[i].innerHTML = 'No matching citation found';
      break;
    }

    var result = results[0];

    var authors = results[0].entryTags.author.split(' and ');

    var resAuthors = '';

    switch (authors.length) {
      case 0:
      cites[i].innerHTML = 'No author';
      break;
      case 2:
      var name2 = authors[1].split(', ');
      resAuthors = ' & ' + name2[0];
      /* falls through */
      case 1:
      var name1 = authors[0].split(', ');
      resAuthors = name1[0] + resAuthors;
      break;
      default:
      var name = authors[0].split(', ');
      resAuthors = name[0] + ' et al.';
    }

    switch (cites[i].nodeName) {
      case 'CITE':
      cites[i].innerHTML = `${resAuthors} (${results[0].entryTags.year})`;
      break;
      case 'CITEP':
      cites[i].innerHTML = `(${resAuthors}, ${results[0].entryTags.year})`;
      break;
    }
  }

});

Tasks.set('waitForImages', 1002, function waitForImages() {
  var images = [].slice.call(document.querySelectorAll('img'));

  return Promise.all(images.map(function(image) {
    return new Promise(function(resolve, reject) {
      image.onload = resolve;
      image.onerror = reject;
    });
  }));

});

Tasks.set('splitPages', 3000, function splitPages() {

  var nodes = [];

  while (document.body.childNodes.length) {
    nodes.push(document.body.firstChild);
    document.body.removeChild(document.body.firstChild);
  }

  var page = newPage();

  while (nodes.length) {

    var node = nodes.shift();  

    if (node.nodeName === '#text') {
      var span = document.createElement('span');
      span.appendChild(node);
      page.appendChild(span);
    } else if (node.nodeName === 'CLEARPAGE') {
      page = newPage();

      if (nodes[0] && nodes[0].nodeName === '#text' && /^[ \t]*$/.test(nodes[0].nodeValue)) {
        nodes.shift();
      }
      continue;
    } else {

      if (node.attributes) {
        for (var i = 0; i < node.attributes.length; i++) {
          if (node.attributes[i].name === 'clearpage') {
            page = newPage();
            break;
          }
        }
      }

      page.appendChild(node);
    }

    // Continue if node fits in page
    if (page.scrollHeight <= page.clientHeight) {
      continue;
    }

    // Not text
    if (node.nodeName !== '#text') {
      page = newPage();
      page.appendChild(node);

      if (page.scrollHeight > page.clientHeight) {
        return console.error(new Error('Element is too big'));
      }

      continue;
    }

    // Is text
    while (page.scrollHeight > page.clientHeight) {

      var clone = node.cloneNode(1);

      // Use binary search to find place were overflown
      var min = 0;
      var max = clone.length;
      var middle;

      while (min <= max) {
        middle = parseInt(min + (max - min) / 2);
        node.nodeValue = clone.nodeValue.substring(0, middle);

        if (page.scrollHeight > page.clientHeight) {
          max = middle - 1;
        } else {
          min = middle + 1;
        }
      }

      // Check if breakpoint should be at space or newline character
      var lastIndex = Math.max(
        node.nodeValue.lastIndexOf(' '),
        node.nodeValue.lastIndexOf('\n')
        );

      node.nodeValue = node.nodeValue.substring(0, lastIndex);

      clone.nodeValue = clone.nodeValue.substring(lastIndex + 1);

      node = clone;
      page = newPage();

      var span1 = document.createElement('span');
      span1.appendChild(node);
      page.appendChild(span1);
    }
  }

  function newPage() {
    var page = document.createElement('div');
    page.className += 'page';

    var content = document.createElement('div');
    content.className += 'content';

    page.appendChild(content);

    document.body.appendChild(page);
    return content;
  }
});

Tasks.set('insertPageNumbers', 4000, function insertPageNumbers() {

  var elements = document.querySelectorAll('body > .page');

  var pageNumber = 1;

  for (var i = 0; i < elements.length; i++) {
    elements[i].pageNumber = pageNumber;
    if (!elements[i].querySelector('hide-page-number')) {
      var div = document.createElement('div');
      div.className += 'page-number';
      div.innerHTML = pageNumber;
      elements[i].appendChild(div);
    }
    pageNumber++;
  }
});

// Remove starting and trailing newline from Body if exists
Tasks.set('trimBodyNewline', 2998, function trimBodyNewline() {
  document.body.innerHTML = document.body.innerHTML
  .replace(/\n{2,}/g, '')
  .replace(/>\n/g, '>');
});

// Remove starting and trailing newline from Body if exists
Tasks.set('waitForFontsLoad', 2999, function waitForFontLoad() {
  return document.fonts.ready;
});

Tasks.set('keepPositionOnRefresh', 9000, function keepPositionOnRefresh() {
  document.body.scrollTop = sessionStorage.getItem('scrollTop');
  window.onscroll = function() {
    sessionStorage.setItem('scrollTop', document.body.scrollTop);
  };
});

Tasks.set('referables', 1500, function referable() {
  var referables = document.querySelectorAll('referable');

  var numbers = {};

  for (var i = 0; i < referables.length; i++) {
    var name = referables[i].getAttribute('name');
    var type = referables[i].getAttribute('type');

    switch (type) {
      case 'table':
      type = 'tabell';
      break;
      case 'figure':
      type = 'figur';
      break;
    }

    numbers[type] = numbers[type] || 0;
    numbers[type]++;

    var label = referables[i].querySelector('label');
    label.innerHTML = `${firstLetterInCaps(type)} ${numbers[type]}: ${label.innerHTML}`;

    var refs = document.querySelectorAll('ref[name="' + name + '"]');

    for (var j = 0; j < refs.length; j++) {
      refs[j].innerHTML = numbers[type];
    }
  }

  function firstLetterInCaps(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

});

Tasks.set('cssPageBreakToJsSplit', 1003, function cssPageBreakToJsSplit() {

  var elements = document.body.children;

  for (var i = 0; i < elements.length; i++) {
    if (window.getComputedStyle(elements[i]).pageBreakBefore === 'always') {
      elements[i].setAttribute('clearpage', '');
      elements[i].style.pageBreakBefore = 'auto';
    }
  }
});

Tasks.set('markdown', 1004, function markdown() {

  var converter = new showdown.Converter({tables: true});

  var elements = document.querySelectorAll('markdown');

  for (var i = 0; i < elements.length; i++) {
    elements[i].innerHTML = converter.makeHtml(elements[i].innerHTML);
  }
});

