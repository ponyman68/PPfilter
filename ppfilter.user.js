// ==UserScript==
// @name         PPfilter
// @namespace    http://tampermonkey.net/
// @updateURL    https://github.com/MaresOnMyFace/PPfilter/raw/main/ppfilter.user.js
// @downloadURL  https://github.com/MaresOnMyFace/PPfilter/raw/main/ppfilter.user.js
// @version      1.2
// @description  Filters images on 4chan /mlp/ by their data-md5 tag
// @author       (You)
// @match        *://boards.4channel.org/mlp*
// @match        *://boards.4chan.org/mlp*
// @run-at       document-start
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==
/* globals $ */

var $ = window.jQuery;

window.PPfilter = {};
window.PPfilter.constant = {};
window.PPfilter.constant.DB_NAME = "filterDb";
window.PPfilter.constant.DB_VERSION = 69;
window.PPfilter.constant.DB_STORE_NAME = "evilMd5s";
window.PPfilter.dbOpenConnection = (async function(){
    function openDb() {
        return new Promise( function(resolve,reject) {
            var req = indexedDB.open(window.PPfilter.constant.DB_NAME, window.PPfilter.constant.DB_VERSION);
            req.onsuccess = function (evt) {
                resolve(req.result);
            };
            req.onerror = function (evt) {
                reject(Error("[FILTERDB] OPEN ERROR: "+evt.target.errorCode));
            };
            req.onupgradeneeded = function (evt) {
                console.log("[FILTERDB] OPEN - UPGRADE NEEDED");
                var store = evt.currentTarget.result.createObjectStore(
                    window.PPfilter.constant.DB_STORE_NAME, { keyPath: 'md5' });

                store.createIndex('md5', 'md5', { unique: true });
                resolve(openDb());
            };
            }
        )
    };
    return await openDb();
});

window.PPfilter.dbCreateUtils = (function(dbConnection) {
    function getObjectStore(store_name, mode) {
        var tx = dbConnection.transaction(store_name, mode);
        return tx.objectStore(store_name);
    }

    function getAll() {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readonly");
        return store.getAll();
    }

    function count() {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readonly");
        return new Promise( function(resolve,reject) {
            var req = store.count();
            req.onsuccess = function (evt) {
              resolve(req.result);
            };
            req.onerror = function (evt) {
              reject(Error("[FILTERDB] COUNT ERROR: " + evt.target.errorCode));
            };
            }
        );
    }
    function get(md5) {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readonly");
        return new Promise( function(resolve,reject) {
            var req = store.get(md5);
            req.onsuccess = function (evt) {
              resolve(req.result);
            };
            req.onerror = function (evt) {
              reject(Error("[FILTERDB] GET ERROR: " + evt.target.errorCode));
            };
            }
        );
    }
    function set(md5) {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readwrite");
        return new Promise( function(resolve,reject) {
            var req = store.add({md5:md5});
            req.onsuccess = function (evt) {
              //console.log("[FILTERDB] add key "+md5);
              resolve(1);
            };
            req.onerror = function (evt) {
              // report key already exists
              // todo dont eat other errors here..
              resolve(0);
            };
            }
        );
    }

    function unset(md5) {
        var store = getObjectStore(window.PPfilter.constant.DB_STORE_NAME,"readwrite");
        return new Promise( function(resolve,reject) {
            var req = store.delete(md5);
            req.onsuccess = function (evt) {
                //console.log("[FILTERDB] delete key "+md5);
                resolve();
            };
            req.onerror = function (evt) {
                reject(Error("[FILTERDB] DELETE ERROR: " + evt.target.errorCode));
            };
            }
        );
    }
    return {
        count:count,
        getAllEvilMd5s:getAll,
        getEvilMd5:get,
        setEvilMd5:set,
        clearEvilMd5:unset
    };
});

window.PPfilter.setEvilMd5inPersistence = async function(dbUtilsProm,md5) {
    await dbUtilsProm.then(function(utils) {utils.setEvilMd5(md5);});
}

window.PPfilter.setMany = async function(dbUtilsProm,arr,progress) {
    var utils = await dbUtilsProm;
    var ct = 0;
    var i = 0;
    for (const md5 of arr) {
        progress(i);
        ct = ct + await utils.setEvilMd5(md5);
        i = i+1;
    }
    progress(arr.length);
    return ct;
}

window.PPfilter.removeEvilMd5fromPersistence = async function(dbUtilsProm,md5) {
    var utils = await dbUtilsProm;
    await utils.clearEvilMd5(md5);
}

window.PPfilter.countDbEntries = async function(dbUtilsProm) {
    var utils = await dbUtilsProm;
    return await utils.count();
}

window.PPfilter.getEvilMd5sfromPersistence = async function(dbUtilsProm) {
    var utils = await dbUtilsProm;
    return new Promise( function(resolve,reject) {
        var req = utils.getAllEvilMd5s();
        req.onsuccess = function(e) {
            var arr = e.target.result.map(o => o.md5);
            resolve(arr);
        }
        req.onerror = function (evt) {
            console.error("[FILTERDB] GETALL: ", evt.target.errorCode);
            reject(Error("[FILTERDB] GETALL: "+evt.target.errorCode) );
        };
        }
    )
}

window.PPfilter.evilMd5ExistsInPersistence = async function(dbUtilsProm,md5) {
    var utils = await dbUtilsProm;
    var got = await utils.getEvilMd5(md5);
    if(got) return 1;
    return 0;
}

// only show the image if it isn't evil
// insert hide/unhide buttons
function handleImageDomNode(dbUtilsProm,n) {
    if(!n.getAttribute("checkedByFilter")) { // guard multiple calls since this code doesnt give a shit
        let md5 = n.getAttribute("data-md5");
        if(md5) {
            n.setAttribute("checkedByFilter","yes");
            var succ = n.nextSibling;
            var parent = n.parentNode;
            var empty = document.createTextNode("🐴");
            parent.replaceChild(empty,n);
            var clearEvilMd5 = function(e) {
                window.PPfilter.removeEvilMd5fromPersistence(dbUtilsProm,md5);
                e.preventDefault();
                e.stopPropagation();
            }
            var addEvilMd5 = function(e) {
                window.PPfilter.setEvilMd5inPersistence(dbUtilsProm,md5);
                e.preventDefault();
                e.stopPropagation();
            }
            var keepImgHiddenAndAddUnhideButton = function() {
                var b = document.createElement("BUTTON");
                b.innerHTML = "clear";
                b.onclick = clearEvilMd5;
                parent.insertBefore(b, succ);
            }
            var showImgAndAddHideButton = function() {
                parent.replaceChild(n,empty);
                var b = document.createElement("BUTTON");
                b.innerHTML = "HIDE";
                b.onclick = function(e) {
                    addEvilMd5(e);
                    parent.replaceChild(empty,n);
                    var b2 = document.createElement("BUTTON");
                    b2.innerHTML = "clear";
                    b2.onclick = clearEvilMd5;
                    parent.insertBefore(b2, succ);
                    b.remove();
                }
                parent.insertBefore(b, succ);
            }
            window.PPfilter.evilMd5ExistsInPersistence(dbUtilsProm,md5).then(function(exists) {
                if(exists){
                    //console.warn("evil found: "+md5);
                    keepImgHiddenAndAddUnhideButton();
                } else {
                    showImgAndAddHideButton();
                }
            });
        }
    }
}

// whenever a div is inserted, check if it contains any img anywhere in the subtree.
// 4chan native extension likes to add raw innerHTML strings into elements directly before adding them to the DOM, this is my last resort
function installStupidMutationObserver(dbUtilsProm,root) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(n){if(n.tagName == "DIV") {
                    //jquery just for this ..
                    $(n).find("img").each(function(idx,node) {handleImageDomNode(dbUtilsProm,node);});
                }
            });
        });
    });
    observer.observe(root, {childList: true, subtree: true});
}

// initial DOM parser (on document) and direct DOM modifications (on fragment or document)
function installSubtreeMutationObserver(dbUtilsProm,root,options) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(n){
                if(n.tagName == "IMG") {
                    handleImageDomNode(dbUtilsProm,n);
                }
            });
        });
    });
    observer.observe(root, options);
}

// every kind of programmatic creation of img nodes and subsequent modification of attributes
// happens in 4chan x a bunch, and possibly other scripts
function installAttributeMutationObserver(dbUtilsProm,root, options) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function(m) {
            if(m.target.tagName == "IMG" && m.attributeName == "data-md5") {
                handleImageDomNode(dbUtilsProm,m.target);
            }
        });
    });
    observer.observe(root, options);
}

function installListenForImgsInSubtreeObserver(dbUtilsProm,root) {
    installSubtreeMutationObserver(dbUtilsProm,root, {childList: true, subtree: true});
}
function installListenForAttributeChangesObserver(dbUtilsProm,root) {
    installAttributeMutationObserver(dbUtilsProm,root, {attributes:true});
}

window.document.originalCreateElement = function(e){return {};};
window.document.originalCreateDocumentFragment = function(){return {};};;
function evacuateCreators() {
    window.document.originalCreateElement = document.createElement;
    window.document.originalCreateDocumentFragment = document.createDocumentFragment;
}

function injectedCreateElement(dbUtilsProm,tag) {
    var el = window.document.originalCreateElement(tag);
    if(tag.toLowerCase() == "img") {
        installListenForAttributeChangesObserver(dbUtilsProm,el)
    }
    return el;
}

function injectedCreateDocumentFragment(dbUtilsProm) {
    var frag = window.document.originalCreateDocumentFragment();
    installListenForImgsInSubtreeObserver(dbUtilsProm,frag);
    return frag;
}

// documentFragments and element modifications outside of DOM used by some 4chan native extension and 4chan X functionality
function injectNodeCreationFunctions(dbUtilsProm) {
    evacuateCreators();
    document.createElement = function(tag) { return injectedCreateElement(dbUtilsProm, tag); };
    document.createDocumentFragment = function() { return injectedCreateDocumentFragment(dbUtilsProm); };
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function httpGet(url)
{
    return new Promise(function (resolve,reject) {
        try {
            GM.xmlHttpRequest({
                method: "GET",
                url: url,
                onload: function(xmlhttp) {
                    if (xmlhttp.readyState==4)
                    {
                        if(xmlhttp.status==200) {
                            resolve({succ:1, value:xmlhttp.responseText, url:url});
                        } else {
                            console.error("[PP XMLHTTP] request bad status:");
                            console.error(xmlhttp);
                            resolve({succ:0, value:"", url:url});
                        }
                    }
                },
                onerror: function() {
                    console.error("[PP XMLHTTP] request error:");
                    resolve({succ:0, value:"", url:url});
                }
            });
        } catch(e) {
            console.error(e);
            resolve({succ:0, value:"", url:url});
        }
    });
}

function readSingleFile(e,cb) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    cb(contents);
  };
  reader.readAsText(file);
}

function parseImport(str,statusStringCallback) {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    const md5Regex = /[A-Za-z0-9+/=]{22}==/g;
    var succ = 0;
    var res = {arr:undefined,urls:undefined};
    var err = {}
    try {
        statusStringCallback("Parsing JSON ...");
        var arr = JSON.parse(str);
        succ = 1;
        res = {arr:arr,urls:[]};

    } catch(e) {
        err.JsonParser = e;
        res = {arr:[],urls:[]};
        statusStringCallback("Parsing MD5s ...");
        for(const m of str.matchAll(md5Regex)) {res.arr.push(m[0]);}
        if(res.arr.length>0) {
            succ=1;
        } else {
            err.RegexParser = "This regex found no matches: " + md5Regex;
        }
        statusStringCallback("Parsing URLs ...");
        for(const m of str.matchAll(urlRegex)) {res.urls.push(m[0]);}

        if(res.urls.length>0) {
            succ=1;
        } else {
            err.UrlParser = "This regex found no matches: " + urlRegex;
        }
    }
    return {result:res, success:succ, error:err};
}

function parseAndImport(dbUtilsProm, str, statusStringCallback, onoff, refreshUi) {
    onoff(false);
    statusStringCallback("parsing...");
    var parsed = parseImport(str,statusStringCallback);
    if(parsed.success) {
        let arr = parsed.result.arr;
        let urlct = parsed.result.urls.length;
        let urli = 0;
        let badUrls = [];
        let badUrlParses = [];
        statusStringCallback("fetching "+urlct+" URLs...");
        let urlProms =
            parsed.result.urls.map(function(url) {
                return httpGet(url).then(function(r) {urli = urli+1;statusStringCallback("fetching "+(urlct-urli)+" URLs...");return r;});
            });
        Promise.all(urlProms).then(function(fetched) {
            urli = 0;
            statusStringCallback("parsing "+urlct+" URLs...");
            for(const f of fetched){
                if(f.succ) {
                    let parsed = parseImport(f.value,statusStringCallback);
                    urli = urli+1;
                    statusStringCallback("parsing "+(urlct-urli)+" URLs...");
                    if(parsed.success) {
                        arr = arr.concat(parsed.result.arr); //ignore urls recursively
                    } else {
                        badUrlParses.push(parsed);
                    }
                } else {
                    badUrls.push(f);
                }
            }

            if(arr.length>0) {
                function progress(ct) {
                    if(ct%10==0) statusStringCallback(ct+" of "+arr.length);
                    if(ct == arr.length) {
                        onoff(true);
                        refreshUi();
                    }
                }
                window.PPfilter.setMany(dbUtilsProm,arr,progress).then(function(ct) {(badUrls.length>0||badUrlParses.length>0)?statusStringCallback("imported "+ct+" new! (bad URLs, see console)"):statusStringCallback("imported "+ct+" new! (again?)");});
            } else {
                statusStringCallback("broken input. (again?)");
                onoff(true);
                console.error(badUrls);
                console.error(badUrlParses);
            }
        });
    } else {
        statusStringCallback("broken input. (again?)");
        onoff(true);
        console.error("TextArea.value parsing error:");
        console.error(parsed.error);
    }
}

var helpstring = `
Import data-md5 entries from a string formatted like this:

* javascript array format i.e.
["0YWEsS/eq8fxPU+TWz6wFw==","0ZA25ixqxea8qxvgejdYGw==","0ZDbpkBbjCuokdL8LflQHw=="]

* or a list of md5s matching the regex /[A-Za-z0-9+/=]{22}==/g i.e.
"0YWEsS/eq8fxPU+TWz6wFw== 0ZA25ixqxea8qxvgejdYGw== 0ZDbpkBbjCuokdL8LflQHw=="
(you can copy the content of the 4chan X settings->filters->Md5 field here directly)

Paste these strings directly, or URLs resolving to these strings, into the text area below. Or put them in a file and use the file picker.
`

function addMenuButton(dbUtilsProm) {
        const style = "top:100px;right:10px;position:absolute;"
        const parent = document.body;

        var open = document.createElement("BUTTON");
        parent.appendChild(open);
        open.setAttribute("style",style);
        open.innerHTML = "open PP options";

        var container = document.createElement("div");
        container.setAttribute("style",style);

        var close = document.createElement("BUTTON");
        close.innerHTML = "close";
        container.appendChild(close);
        var help = document.createElement("SPAN");
        help.innerHTML = "❔";
        help.setAttribute("title",helpstring);
        container.appendChild(help);

        // === entry counter ===
        var counting = document.createElement("P");
        counting.innerHTML = "counting...";
        function updateCounting() {
            window.PPfilter.countDbEntries(dbUtilsProm).then(function(ct) {counting.innerHTML = "PP IndexedDB entries: "+ct;});
        };
        updateCounting();
        container.appendChild(counting);

        // === export button ===
        var exx = document.createElement("BUTTON");
        exx.innerHTML = "wait...";
        function exportTramp() {
            exx.innerHTML="wait...";window.PPfilter.getEvilMd5sfromPersistence(dbUtilsProm).then(function(arr) {exportArr(arr);})
        }
        function exportArr(arr) {
            var json = JSON.stringify(arr);
            download(json, 'PP-indexeddb-'+Date.now()+'.json', 'text/plain');
            exx.innerHTML="export javascript array";
            exx.onclick = exportTramp;
        }
        window.PPfilter.countDbEntries(dbUtilsProm).then(function () {
            exx.innerHTML="export javascript array";
            exx.onclick = exportTramp;
        });
        container.appendChild(exx);

        // === import from textarea button ===
        var p2 = document.createElement("P");
        var input = document.createElement("TEXTAREA");
        var imm = document.createElement("BUTTON");
        imm.innerHTML = "wait...";
        function importArr() {
            if(!input.value) {return;}

            function onoff(isOn) {
                if(!isOn){
                    imm.onclick = function() {return;};
                } else {
                    imm.onclick = importArr;
                }
            }
            function updateStatus(str) { imm.innerHTML = str; }
            function refreshUi() {updateCounting();};

            parseAndImport(dbUtilsProm,input.value,updateStatus,onoff,refreshUi);
        }

        window.PPfilter.countDbEntries(dbUtilsProm).then(function () {
            imm.innerHTML="Import from string(s) or URL(s)";
            imm.onclick = importArr;
        });
        p2.appendChild(imm);
        p2.appendChild(document.createElement("BR"));
        p2.appendChild(input);
        container.appendChild(p2);

        // === import from file button ===
        var p4 = document.createElement("P");
        var sp = document.createElement("SPAN");
        sp.innerHTML = "wait...";
        p4.appendChild(sp);
        window.PPfilter.countDbEntries(dbUtilsProm).then(function() {
            sp.innerHTML = "Import from file";
            var fileInput = document.createElement("INPUT");
            fileInput.setAttribute("type","file");
            p4.appendChild(document.createElement("BR"));
            p4.appendChild(fileInput);
            function parseString(str) {
                if(!str) {return;}

                function onoff(isOn) {
                    if(!isOn){
                        fileInput.setAttribute("disabled","");
                    } else {
                        fileInput.removeAttribute("disabled");
                    }
                }
                function updateStatus(str) { sp.innerHTML = str; }
                function refreshUi() {updateCounting();};

                parseAndImport(dbUtilsProm,str,updateStatus,onoff,refreshUi);
            };
            fileInput.addEventListener('change', function(e) {readSingleFile(e,parseString);}, false);
        });
        container.appendChild(p4);

        function openFn() {
            parent.replaceChild(container,open);
        }
        function closeFn() {
            parent.replaceChild(open,container);
        }
        open.onclick = openFn;
        close.onclick = closeFn;
}

var installer = function() {
    // todo: open indexeddb connection and never close it ..?
    var dbUtilsProm = window.PPfilter.dbOpenConnection().then(function(conn) { return window.PPfilter.dbCreateUtils(conn); });

    //this is for the DOM parser
    installListenForImgsInSubtreeObserver(dbUtilsProm,document);
    //this is for 4chan x and 4chan native extension (document.createElement and fragments)
    injectNodeCreationFunctions(dbUtilsProm);
    //this is for 4chan native extension thread updater and inline expansion (direct insertion of html text)
    window.setTimeout(function() { installStupidMutationObserver(dbUtilsProm,document); }, 100);

    $(document).ready(function() {addMenuButton(dbUtilsProm)});
};

installer();
