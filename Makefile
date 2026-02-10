UUID = googletasks@ztluwu.dev

.PHONY: all pack install clean

all: dist/extension.js

bun.lock: package.json
	bun install

dist/extension.js: bun.lock *.ts
	bun run build

$(UUID).zip: dist/extension.js
	@cp metadata.json dist/
	@cp stylesheet.css dist/
	@(cd dist && zip ../$(UUID).zip -9r .)

pack: $(UUID).zip

install: $(UUID).zip
	@gnome-extensions install --force $(UUID).zip

clean:
	@rm -rf dist node_modules $(UUID).zip
