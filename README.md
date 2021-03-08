# PPfilter
Userscript for filtering images on 4chan /mlp/ by data-md5.

Works on any board, just adjust the url.

The repository includes approximately 10k hand-picked MD5 with barby content. Also included is a text file with links to approximately 180k more MD5s of offending content.

# Usage

Install the userscript and navigate to /mlp/. Every image has a hide/show button. On the top right of the page is a button with import/export options for your local MD5 database. You can copy/paste the urls or files from this repository in there to fill your database.

# Details

This script uses the IndexedDB local storage API of your browser to locally persist MD5 entries. It filters images on 4chan against this local storage, making it possible to have a very large database without performance losses (unlike 4chan X's solution). 

> :warning: **Attention**: If you "clear all local data" in your browser, it will also clear this local store. Please use the "Export" button early and often, and only clear your cookies when trying to circumvent 4chan bans. 

The Mutation Observer API is used to apply our filter instantly on page load, during initial DOM parsing (preventing the "flickering" of offending images you have with 4chan X and the 4chan native extension when refreshing the page). 

The code is extremely simple and should be modified easily (please use pull requests or notify me on /mlp/ Fan Site Alternative thread). 

## Todos

* Find a way to collect a large number of offending md5s to finish this proof of concept.

## Known issues

* doesn't work in 4chan catalog which doesn't expose md5s.
* not sufficiently tested in very advanced/fancy 4chan X functionalities.
