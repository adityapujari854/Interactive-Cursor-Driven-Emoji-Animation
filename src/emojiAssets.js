/*
 * The Emojis — Noto Emoji animation catalog
 *
 * Uses the official Noto Emoji Animation web assets documented at:
 * https://googlefonts.github.io/noto-emoji-animation/
 *
 * Only URLs that successfully load/decode are exposed to the scene.
 * This prevents broken-image icons from ever being inserted into the UI.
 */

export const NOTO_EMOJI_BASE =
  'https://fonts.gstatic.com/s/e/notoemoji/latest';

/*
 * Single-code-point emoji are intentionally used here. This keeps the
 * Google Fonts CDN path deterministic: /<codepoint>/512.webp
 */
export const NOTO_EMOJI_CANDIDATES = [
  ['1f600', '😀', 'Grinning Face'],
  ['1f603', '😃', 'Grinning Face with Big Eyes'],
  ['1f604', '😄', 'Grinning Face with Smiling Eyes'],
  ['1f601', '😁', 'Beaming Face'],
  ['1f606', '😆', 'Grinning Squinting Face'],
  ['1f605', '😅', 'Grinning Face with Sweat'],
  ['1f602', '😂', 'Face with Tears of Joy'],
  ['1f923', '🤣', 'Rolling on the Floor Laughing'],
  ['1f609', '😉', 'Winking Face'],
  ['1f60a', '😊', 'Smiling Face with Smiling Eyes'],
  ['1f607', '😇', 'Smiling Face with Halo'],
  ['1f642', '🙂', 'Slightly Smiling Face'],
  ['1f643', '🙃', 'Upside-Down Face'],
  ['1f60d', '😍', 'Heart Eyes'],
  ['1f60e', '😎', 'Sunglasses'],
  ['1f60f', '😏', 'Smirking Face'],
  ['1f612', '😒', 'Unamused Face'],
  ['1f614', '😔', 'Pensive Face'],
  ['1f61e', '😞', 'Disappointed Face'],
  ['1f61f', '😟', 'Worried Face'],
  ['1f615', '😕', 'Confused Face'],
  ['1f641', '🙁', 'Slightly Frowning Face'],
  ['1f623', '😣', 'Persevering Face'],
  ['1f616', '😖', 'Confounded Face'],
  ['1f62b', '😫', 'Tired Face'],
  ['1f629', '😩', 'Weary Face'],
  ['1f622', '😢', 'Crying Face'],
  ['1f62d', '😭', 'Loudly Crying Face'],
  ['1f624', '😤', 'Face with Steam From Nose'],
  ['1f620', '😠', 'Angry Face'],
  ['1f621', '😡', 'Enraged Face'],
  ['1f92c', '🤬', 'Face with Symbols on Mouth'],
  ['1f92f', '🤯', 'Exploding Head'],
  ['1f631', '😱', 'Face Screaming in Fear'],
  ['1f628', '😨', 'Fearful Face'],
  ['1f630', '😰', 'Anxious Face with Sweat'],
  ['1f625', '😥', 'Sad but Relieved Face'],
  ['1f613', '😓', 'Downcast Face with Sweat'],
  ['1f634', '😴', 'Sleeping Face'],
  ['1f924', '🤤', 'Drooling Face'],
  ['1f62a', '😪', 'Sleepy Face'],
  ['1f635', '😵', 'Face with Crossed-Out Eyes'],
  ['1f92b', '🤫', 'Shushing Face'],
  ['1f92d', '🤭', 'Face with Hand Over Mouth'],
  ['1f910', '🤐', 'Zipper-Mouth Face'],
  ['1f974', '🥴', 'Woozy Face'],
  ['1f922', '🤢', 'Nauseated Face'],
  ['1f92e', '🤮', 'Face Vomiting'],
  ['1f637', '😷', 'Face with Medical Mask'],
  ['1f912', '🤒', 'Face with Thermometer'],
  ['1f915', '🤕', 'Face with Head-Bandage'],
  ['1f911', '🤑', 'Money-Mouth Face'],
  ['1f920', '🤠', 'Cowboy Hat Face'],
  ['1f608', '😈', 'Smiling Face with Horns'],
  ['1f47f', '👿', 'Angry Face with Horns'],
  ['1f479', '👹', 'Ogre'],
  ['1f47a', '👺', 'Goblin'],
  ['1f921', '🤡', 'Clown Face'],
  ['1f4a9', '💩', 'Pile of Poo'],
  ['1f47b', '👻', 'Ghost'],
  ['1f480', '💀', 'Skull'],
  ['1f47d', '👽', 'Alien'],
  ['1f916', '🤖', 'Robot'],
  ['1f383', '🎃', 'Jack-O-Lantern'],
  ['1f63a', '😺', 'Grinning Cat'],
  ['1f638', '😸', 'Grinning Cat with Smiling Eyes'],
  ['1f639', '😹', 'Cat with Tears of Joy'],
  ['1f63b', '😻', 'Heart-Eyes Cat'],
  ['1f63c', '😼', 'Cat with Wry Smile'],
  ['1f63d', '😽', 'Kissing Cat'],
  ['1f640', '🙀', 'Weary Cat'],
  ['1f63f', '😿', 'Crying Cat'],
  ['1f63e', '😾', 'Pouting Cat'],
  ['1f648', '🙈', 'See-No-Evil Monkey'],
  ['1f649', '🙉', 'Hear-No-Evil Monkey'],
  ['1f64a', '🙊', 'Speak-No-Evil Monkey'],
  ['1f435', '🐵', 'Monkey Face'],
  ['1f98a', '🦊', 'Fox'],
  ['1f43c', '🐼', 'Panda'],
  ['1f438', '🐸', 'Frog'],
  ['1f984', '🦄', 'Unicorn'],
  ['1f419', '🐙', 'Octopus'],
  ['1f98b', '🦋', 'Butterfly'],
  ['1f308', '🌈', 'Rainbow'],
  ['2b50', '⭐', 'Star'],
  ['1f31f', '🌟', 'Glowing Star'],
  ['2728', '✨', 'Sparkles'],
  ['1f525', '🔥', 'Fire'],
  ['1f4ab', '💫', 'Dizzy'],
  ['26a1', '⚡', 'High Voltage'],
  ['1f4a5', '💥', 'Collision'],
  ['1f319', '🌙', 'Crescent Moon'],
  ['1f340', '🍀', 'Four Leaf Clover'],
  ['1f355', '🍕', 'Pizza'],
  ['1f354', '🍔', 'Hamburger'],
  ['1f369', '🍩', 'Doughnut'],
  ['1f36a', '🍪', 'Cookie'],
  ['1f349', '🍉', 'Watermelon'],
  ['1f353', '🍓', 'Strawberry'],
  ['1f34c', '🍌', 'Banana'],
  ['1f34e', '🍎', 'Red Apple'],
  ['1f36d', '🍭', 'Lollipop'],
  ['1f388', '🎈', 'Balloon'],
  ['1f389', '🎉', 'Party Popper'],
  ['1f38a', '🎊', 'Confetti Ball'],
  ['1f381', '🎁', 'Wrapped Gift'],
  ['1f680', '🚀', 'Rocket'],
  ['1f6f8', '🛸', 'Flying Saucer'],
  ['1f48e', '💎', 'Gem Stone'],
  ['1f44d', '👍', 'Thumbs Up'],
  ['1f44e', '👎', 'Thumbs Down'],
  ['1f44f', '👏', 'Clapping Hands'],
  ['1f64c', '🙌', 'Raising Hands'],
  ['1f91d', '🤝', 'Handshake'],
  ['1f64f', '🙏', 'Folded Hands'],
  ['1f4aa', '💪', 'Flexed Biceps'],
  ['1f440', '👀', 'Eyes'],
  ['1f44b', '👋', 'Waving Hand'],
  ['270c', '✌️', 'Victory Hand'],
  ['1f918', '🤘', 'Sign of the Horns'],
  ['1f44c', '👌', 'OK Hand'],
  ['1f90c', '🤌', 'Pinched Fingers'],
  ['1f9e0', '🧠', 'Brain']
].map(([codePoint, char, name]) => ({
  codePoint,
  char,
  name,
  url: `${NOTO_EMOJI_BASE}/${codePoint}/512.webp`
}));

function shuffled(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadImage(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(ok ? image : null);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);

    image.decoding = 'async';
    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') {
          await image.decode();
        }
      } catch {
        // onload + natural dimensions are still sufficient for a valid asset.
      }
      finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    };
    image.onerror = () => finish(false);
    image.src = url;
  });
}

export async function validateEmojiAsset(entry, timeoutMs = 8000) {
  const image = await loadImage(entry.url, timeoutMs);
  if (!image) return null;
  return {
    ...entry,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight
  };
}

/*
 * Select exactly `count` working animated assets. Failed URLs are silently
 * discarded, so broken-image placeholders never enter the scene.
 */
export async function selectValidatedEmojiSet(count = 24, excluded = new Set()) {
  const candidates = shuffled(
    NOTO_EMOJI_CANDIDATES.filter((entry) => !excluded.has(entry.codePoint))
  );
  const selected = [];
  const concurrency = 8;
  let cursor = 0;

  async function worker() {
    while (selected.length < count && cursor < candidates.length) {
      const entry = candidates[cursor++];
      const valid = await validateEmojiAsset(entry);
      if (valid && !selected.some((item) => item.codePoint === valid.codePoint)) {
        selected.push(valid);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  if (selected.length < count) {
    throw new Error(
      `Only ${selected.length}/${count} Noto Emoji animation assets could be loaded.`
    );
  }

  return selected.slice(0, count);
}
