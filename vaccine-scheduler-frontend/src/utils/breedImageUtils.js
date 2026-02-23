const BREED_IMAGES = {
  beagle: '/Images/dog_breeds/beagle.jpeg',
  bernese_mountain_dog: '/Images/dog_breeds/bernese_mountain_dog.jpg',
  border_collie: '/Images/dog_breeds/border_collie.jpeg',
  boxer: '/Images/dog_breeds/boxer.jpg',
  cavalier_king_charles: '/Images/dog_breeds/cavalier_king_charles.jpg',
  dachshund: '/Images/dog_breeds/dachshund.jpg',
  dalmatian: '/Images/dog_breeds/dalmatian.jpg',
  doberman_pinscher: '/Images/dog_breeds/doberman_pinscher.jpg',
  french_bulldog: '/Images/dog_breeds/french_bulldog.jpg',
  german_shepherd: '/Images/dog_breeds/german_shepherd.jpg',
  golden_retriever: '/Images/dog_breeds/golden_retriever.jpg',
  great_dane: '/Images/dog_breeds/great_dane.jpg',
  labrador_retriever: '/Images/dog_breeds/labrador_retriever.jpg',
  pitbull: '/Images/dog_breeds/pitbull.jpeg',
  pomeranian: '/Images/dog_breeds/pomeranian.jpg',
  poodle: '/Images/dog_breeds/poodle.png',
  pug: '/Images/dog_breeds/pug.jpg',
  rottweiler: '/Images/dog_breeds/rottweiler.jpg',
  shih_tzu: '/Images/dog_breeds/shih_tzu.jpg',
  siberian_husky: '/Images/dog_breeds/siberian_husky.jpg',
  yorkshire_terrier: '/Images/dog_breeds/yorkshire_terrier.jpg',
};

const BREED_KEYS = Object.keys(BREED_IMAGES);
const BREED_VALUES = Object.values(BREED_IMAGES);

function getRandomBreedImage(seed) {
  // Use a stable index derived from the seed so the same dog always gets the same random image
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BREED_VALUES.length;
  return BREED_VALUES[index];
}

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function getBreedImage(breedName) {
  const input = normalize(breedName);
  if (!input) return getRandomBreedImage(breedName);

  // Substring match: input contains breed key or breed key contains input
  for (const key of BREED_KEYS) {
    if (key.includes(input) || input.includes(key)) {
      return BREED_IMAGES[key];
    }
  }

  // Also check individual words from the input against breed keys
  const inputWords = input.split('_').filter(Boolean);
  for (const word of inputWords) {
    if (word.length < 3) continue;
    for (const key of BREED_KEYS) {
      if (key.includes(word)) {
        return BREED_IMAGES[key];
      }
    }
  }

  // Levenshtein distance fallback
  let bestKey = null;
  let bestDist = Infinity;

  for (const key of BREED_KEYS) {
    const dist = levenshteinDistance(input, key);
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  }

  const threshold = Math.max(3, Math.floor(bestKey.length * 0.4));
  if (bestDist <= threshold) {
    return BREED_IMAGES[bestKey];
  }

  return getRandomBreedImage(input);
}

export function getDogImageUrl(dog) {
  if (dog.image) return dog.image;
  if (dog.breed) return getBreedImage(dog.breed);
  return getRandomBreedImage(dog.name || String(dog.id));
}
