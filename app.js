/**
 * Game Counter is a prototype document-driven app.
 */

//////////////////////////////
///// Framework Code ///////
//////////////////////////////

var documentApi;
var myDoc;
var myDocId;
var functionQueue = [];


function watchDocument(docref, OnUpdate) {
  documentApi.watch(docref, function(updatedDocRef) {
    if (docref != myDocId) {
      console.log("Wrong document!!");
    } else {
      documentApi.get(docref, OnUpdate);
    }
  }, function(result) {
    var timestamp = result.Expires;
    var expires = timestamp - new Date().getTime();
    var timeout = 0.8 * expires;
    setTimeout(function() {
      watchDocument(docref, OnUpdate);
    }, timeout);
  }, Error);
}

function initDocument() {
  if (TwoPlus.isInstalled()) {
    documentApi = TwoPlus.document;
    _loadDocument();
  } else {
    var yjclient = YeouijuClient.getInstance();
    yjclient.setPipelineProcessors();
    documentApi = yjclient.document;
    yjclient.ensureRegistration(function() {
      yjclient.syncRealtime();
      _loadDocument();
    }, Error);
  }
}

function hasDocument() {
	var docIdParam = window.location.hash.indexOf("/docId/");
 	return (docIdParam != -1);
}

function getDocumentReference() {
	var docIdParam = window.location.hash.indexOf("/docId/");
	if (docIdParam == -1) return false;
	var docId = window.location.hash.substring(docIdParam+7);
    var end = docId.indexOf("/");
    if (end != -1) {
      docId = docId.substring(0, end);
    }
    return docId;
}

function _loadDocument() {
  if (hasDocument()) {
    myDocId = getDocumentReference();
    documentApi.get(myDocId, ReceiveUpdate);
    watchDocument(myDocId, ReceiveUpdate);
  } else {
    documentApi.create(function(d) {
      myDocId = d.Document;
      location.hash = "#/docId/" + myDocId;
      documentApi.update(myDocId, function(o,p){return p},  InitialDocument(), function() {
        documentApi.get(myDocId, DocumentCreated);
      });
      watchDocument(myDocId, ReceiveUpdate);
    }, function(e) {
      alert("error" + e);
    });
  }
}

function sendUpdates() {
  if (functionQueue.length == 0)
    return;

  var p = functionQueue.shift();
  var s = function() {
    sendUpdates();
  }
  var e = function() {
    functionQueue.unshift(p);
    ReceiveUpdate(myDoc);
    setTimeout(sendUpdates, 5000);
  }
  documentApi.update(myDocId, p[0], p[1], s, e);
}

// Optimistic apply
function ApplyUpdate(func, params) {
  functionQueue.push([func, params]);
  ReceiveUpdate(myDoc);

  sendUpdates();
}


//////////////////////////////
///// Application Code ///////
//////////////////////////////

function Error(e) {
  alert("Error!");
}

var numPlayers;

function InitialDocument() {
	var initialLife = [];
	for (i = 0; i < numPlayers; i++) {
		initialLife.push(20);
	}

	return {
  	  life: initialLife
    };
}

function DocumentCreated(doc) {
	if (TwoPlus.isInstalled()) {
		var rdl = TwoPlus.createRDL({
			"noun": "Game Counter",
			"displayTitle": "Game Counter",
			"displayThumbnailUrl": "http://upload.wikimedia.org/wikipedia/en/a/aa/Magic_the_gathering-card_back.jpg",
			"displayText": "Click to join the game counter!",
			"callback": window.location.href,
		});
		TwoPlus.setPasteboard(rdl);
		TwoPlus.exit();
	} else {
		ReceiveUpdate(doc);
	}
}

function ReceiveUpdate(doc) {
  myDoc = doc;
  for (i=0;i<functionQueue.length;i++) {
    var t = functionQueue[i];
    t[0](myDoc, t[1]);
  }
  Render(doc);
}

function Render(state) {
  var html = "<div class='player'>";
  for (i = 0; i < state.life.length; i++) {
    var cname = "tile_" + i;
    html += "<input class='player' id='"+cname+"' type='text' value='" + state.life[i] + "'/>";
    html += "<button onclick='IncrementCounter(" + i + ",-1)'>-</button>";
    html += "<button onclick='IncrementCounter(" + i + ", 1)'>+</button>";
    html += "<br/>";
  }
  html += "</div>";
  $("#app").html(html);
}

function StartGame(players) {
	numPlayers = players;
	initDocument();
}

function IncrementCounter(player, amount) {
  var f = function(o,p){ o.life[p.player] = o.life[p.player] + p.amount; return o; };
	ApplyUpdate(f, { "player" : player, "amount" : amount });
}

function ShowSettings() {
	$("#app").html($("#settings_template").html());
}

TwoPlus.ready(function() {
  // Use this to link an account to your browser's device token for development purposes.
  /*
  var link = { "Identity" : "email:YOUR_EMAIL_HERE@gmail.com"};
  YeouijuClient.getInstance().post("/a/api/0/link?f=sif", link,
  function() {
    alert("Yay! we sent an email to get this account linked");
  }, function() {
    alert("Booo! We failed to link the account.");
  });
  */

  if (hasDocument()) {
  	initDocument();
  } else {
  	ShowSettings();
  }
});

// fastclick gets rid of touch lag for simple webapps.
window.addEventListener('load', function() {
    FastClick.attach(document.body);
}, false);