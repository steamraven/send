/* global window, document, fetch */

window.MAXFILESIZE = 1024 * 1024 * 1024 * 2;

const html = require('choo/html');
const EventEmitter = require('events');
const emitter = new EventEmitter();

function uploadComplete(file) {
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
  function onclickSendAnother(_e) {
    render();
    document.getElementById('label').click();
  }
  const input = html`<input id="url" value=${file.url} readonly="true" />`;
  const copyText = html`<span>Copy link</span>`;
  const node = html`<div id="white">
    <div class="card">
      <div>The card contents will be here.</div>
      <div>Expires after: <span class="expires-after">exp</span></div>
      ${input}
      <div id="copy-link" onclick=${onclick}>
        <img id="copy-image" src="copy-link.png" />
        ${copyText}
      </div>
      <img id="send-another" src="cloud-upload.png" onclick=${onclickSendAnother} />
  </div>`;

  document.body.innerHTML = '';
  document.body.appendChild(node);
}

const state = {
  translate: (...toTranslate) => {
    return toTranslate.map(o => JSON.stringify(o)).toString();
  },
  raven: {
    captureException: e => {
      console.error('ERROR ' + e + ' ' + e.stack);
    }
  },
  storage: {
    files: [],
    remove: function(fileId) {
      console.log('REMOVE FILEID', fileId);
    },
    writeFile: function(file) {
      console.log('WRITEFILE', file);
    },
    addFile: uploadComplete,
    totalUploads: 0
  },
  transfer: null,
  uploading: false,
  settingPassword: false,
  passwordSetError: null,
  route: '/'
};

function upload(event) {
  event.preventDefault();
  const target = event.target;
  const file = target.files[0];
  if (file.size === 0) {
    return;
  }

  emitter.emit('addFiles', { files: [file] });
  emitter.emit('upload', {});
}

function render() {
  const node = html`<div id="white">
    <div id="centering">
      <img src="encrypted-envelope.png" />
      <h4>Private, Encrypted File Sharing</h4>
      <div>
        Send files through a safe, private, and encrypted link that automatically expires to ensure your stuff does not remain online forever.
      </div>
      <div id="spacer">
      </div>
      <label id="label" for="input">
        <img src="cloud-upload.png" />
      </label>
      <input id="input" name="input" type="file" onchange=${upload} />
    </div>
  </div>`;
  document.body.innerHTML = '';
  document.body.appendChild(node);
}

emitter.on('render', function() {
  if (!state.transfer || !state.transfer.progress) {
    return;
  }
  const percent = Math.floor(state.transfer.progressRatio * 100);
  function onclick(e) {
    e.preventDefault();
    if (state.uploading) {
      emitter.emit('cancel');
      render();
    }
  }
  const node = html`<div id="white">
    <div class="card">
      <div>${percent}%</div>
      <span class="progress" style="width: ${percent}%">.</span>
      <div class="cancel" onclick=${onclick}>CANCEL</div>
    </div>
  </div>`;
  document.body.innerHTML = '';
  document.body.appendChild(node);
});

emitter.on('pushState', function(path) {
  console.log('pushState ' + path + ' ' + JSON.stringify(state));
});

const fileManager = require('../app/fileManager').default;
try {
  fileManager(state, emitter);
} catch (e) {
  console.error('error' + e);
  console.error(e);
}

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

render();
