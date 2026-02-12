UUID = googletasks@ztluwu.dev
DIST_ASSETS = dist/metadata.json dist/stylesheet.css

.PHONY: all lint-dist pack install clean

all: dist/extension.js $(DIST_ASSETS)

bun.lock: package.json
	bun install

dist/extension.js: bun.lock src/*.ts src/*.d.ts
	bun run build

dist/metadata.json: metadata.json
	@cp metadata.json dist/

dist/stylesheet.css: src/stylesheet.css
	@cp src/stylesheet.css dist/

$(UUID).zip: lint-dist dist/extension.js $(DIST_ASSETS)
	@(cd dist && zip ../$(UUID).zip -9r .)

lint-dist: dist/extension.js $(DIST_ASSETS)
	-bun run lint:dist

pack: $(UUID).zip

install: $(DIST_ASSETS) $(UUID).zip
	@gnome-extensions install --force $(UUID).zip

clean:
	@rm -rf dist node_modules $(UUID).zip
