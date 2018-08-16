/* global window, document, fetch */

window.MAXFILESIZE = 1024 * 1024 * 1024 * 2;

const choo = require('choo');
const html = require('choo/html');

function uploadComplete(state, emit) {
  const file = state.storage.files[state.storage.files.length - 1];
  function onclick(e) {
    e.preventDefault();
    input.select();
    document.execCommand('copy');
    input.selectionEnd = input.selectionStart;
    copyText.textContent = 'Copied!';
    setTimeout(function() {
      copyText.textContent = 'Copy link';
    }, 2000);
  }

  function uploadFile(event) {
    event.preventDefault();
    const target = event.target;
    const file = target.files[0];
    if (file.size === 0) {
      return;
    }

    emit('pushState', '/upload');
    emit('addFiles', { files: [file] });
    emit('upload', {});
  }

  const input = html`<input id="url" value=${file.url} readonly="true" />`;
  const copyText = html`<span>Copy link</span>`;
  return html`<body>
  <div id="white">
    <div class="card">
      <div>The card contents will be here.</div>
      <div>Expires after: <span class="expires-after">exp</span></div>
      ${input}
      <div id="copy-link" onclick=${onclick}>
        <img id="copy-image" src=${state.getAsset('copy-link.png')} />
        ${copyText}
      </div>
      <label id="label" for="input">
        <img src=${state.getAsset('cloud-upload.png')} />
      </label>
      <input id="input" name="input" type="file" onchange=${uploadFile} />
  </div>
</body>`;
}

function initialState(state, emitter) {
  const files = [];

  Object.assign(state, {
    getAsset(name) {
      return `/android_asset/${name}`;
    },
    translate: (...toTranslate) => {
      return toTranslate.map(o => JSON.stringify(o)).toString();
    },
    raven: {
      captureException: e => {
        console.error('ERROR ' + e + ' ' + e.stack);
      }
    },
    storage: {
      files,
      remove: function(fileId) {
        console.log('REMOVE FILEID', fileId);
      },
      writeFile: function(file) {
        console.log('WRITEFILE', file);
      },
      addFile: function(file) {
        console.log('addfile' + JSON.stringify(file));
        files.push(file);
        emitter.emit('pushState', `/share/${file.id}`);
      },
      totalUploads: 0
    },
    transfer: null,
    uploading: false,
    settingPassword: false,
    passwordSetError: null,
    route: '/'
  });
}

function mainPage(state, emit) {
  function uploadFile(event) {
    event.preventDefault();
    const target = event.target;
    const file = target.files[0];
    if (file.size === 0) {
      return;
    }

    emit('pushState', '/upload');
    emit('addFiles', { files: [file] });
    emit('upload', {});
  }
  return html`<body>
  <div id="white">
    <div id="centering">
      <img src=${state.getAsset('encrypted-envelope.png')} />
      <h4>Private, Encrypted File Sharing</h4>
      <div>
        Send files through a safe, private, and encrypted link that automatically expires to ensure your stuff does not remain online forever.
      </div>
      <div id="spacer">
      </div>
      <label id="label" for="input">
        <img src=${state.getAsset('cloud-upload.png')} />
      </label>
      <input id="input" name="input" type="file" onchange=${uploadFile} />
    </div>
  </div>
</body>`;
}

function progressBar(state, emit) {
  let percent = 0;
  if (state.transfer && state.transfer.progress) {
    percent = Math.floor(state.transfer.progressRatio * 100);
  }
  function onclick(e) {
    e.preventDefault();
    if (state.uploading) {
      emit('cancel');
    }
    emit('pushState', '/');
  }
  return html`<body>
  <div id="white">
    <div class="card">
      <div>${percent}%</div>
      <span class="progress" style="width: ${percent}%">.</span>
      <div class="cancel" onclick=${onclick}>CANCEL</div>
    </div>
  </div>
</body>`;
}

function intentHandler(state, emitter) {
  window.addEventListener(
    'message',
    event => {
      fetch(event.data)
        .then(res => res.blob())
        .then(blob => {
          emitter.emit('addFiles', { files: [blob] });
          emitter.emit('upload', {});
        })
        .catch(e => console.error('ERROR ' + e + ' ' + e.stack));
    },
    false
  );
}

const app = choo();

app.use(initialState);
app.use(require('../app/fileManager').default);
app.use(intentHandler);
app.route('/', mainPage);
app.route('/upload', progressBar);
app.route('/share/:id', uploadComplete);
app.mount('body');
