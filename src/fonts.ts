import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

/**
 * Local font loading.
 *
 * Fonts are vendored into public/fonts/ so the renderer never depends on
 * fonts.googleapis.com / fonts.gstatic.com being reachable mid-render.
 * A network hiccup during a 2-minute render previously caused silent
 * fallback to generic sans-serif.
 *
 * @remotion/fonts loadFont() registers the FontFace and blocks the frame
 * until it is ready, so no fallback glyphs can leak into the output.
 */
export const loadFonts = async () => {
  await Promise.all([
    loadFont({
      family: 'Bangers',
      url: staticFile('fonts/bangers-latin.ttf'),
      weight: '400',
      format: 'truetype',
    }),
    loadFont({
      family: 'Anton',
      url: staticFile('fonts/anton-latin.ttf'),
      weight: '400',
      format: 'truetype',
    }),
  ]);
};

export const FONT_BANGERS = 'Bangers';
export const FONT_ANTON = 'Anton';
export const bangersFont = FONT_BANGERS;
export const antonFont = FONT_ANTON;
