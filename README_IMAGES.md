# Adding Character Images to Your Bible Reader

I've updated the code to support real images! Here's how to add them:

## ✅ Code is Ready!
The app now supports both:
- **Real images** (when you add image URLs)
- **Letter placeholders** (automatic fallback)

## 🖼️ Where to Find FREE Public Domain Biblical Character Images

### 1. **Wikimedia Commons** (Best Option!)
- URL: https://commons.wikimedia.org/
- Search for: "Jesus painting", "Moses biblical art", etc.
- Filter by: Public Domain or CC0 licenses
- High-quality classical religious art

### 2. **The Metropolitan Museum of Art**
- URL: https://www.metmuseum.org/art/collection
- Search: Biblical characters
- Filter: "Public Domain Artworks"
- Download high-resolution images

### 3. **Rijksmuseum (Amsterdam)**
- URL: https://www.rijksmuseum.nl/en
- Search: Biblical names
- All images are public domain
- Excellent quality Dutch masters

### 4. **Art Institute of Chicago**
- URL: https://www.artic.edu/collection
- Filter by: CC0 Public Domain
- Great Renaissance and Medieval art

### 5. **Unsplash / Pexels** (Modern Photography)
- For more contemporary/symbolic images
- Free to use for any purpose

## 📝 How to Add Images to Your App

### Option 1: Use Online Image URLs
Edit `characters.json` and replace the `"image": "placeholder"` with a real URL:

```json
{
  "name": "Moses",
  "description": "Prophet and leader...",
  "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Michelangelo_Moses.jpg/800px-Michelangelo_Moses.jpg",
  ...
}
```

### Option 2: Download and Use Local Images
1. Create a folder called `images/` in your project
2. Download images and save them (e.g., `moses.jpg`, `jesus.jpg`)
3. Update `characters.json`:

```json
{
  "name": "Moses",
  "image": "images/moses.jpg",
  ...
}
```

## 🎨 Image Recommendations

### Best Image Specs:
- **Size**: 200x200px to 500x500px (larger is better)
- **Format**: JPG or PNG
- **Aspect Ratio**: Square (1:1) works best
- **Style**: Classical paintings look great with the sepia theme!

### Suggested Search Terms:
- "Moses Michelangelo" - famous sculpture
- "Jesus Christ painting" - countless classical works
- "David king of Israel art"
- "Abraham patriarch painting"
- "Virgin Mary medieval art"
- "Saint Paul apostle"

## 🚀 Quick Start Example

Here's an example using Wikimedia Commons for Moses:

```json
{
  "name": "Moses",
  "description": "Prophet and leader who led the Israelites out of Egypt",
  "facts": [...],
  "appearances": [...],
  "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Michelangelo_Moses.jpg/400px-Michelangelo_Moses.jpg"
}
```

## ⚠️ Important Notes

1. **Check Licenses**: Make sure images are public domain or CC0
2. **Image Loading**: If an image fails to load, the letter placeholder appears automatically
3. **Performance**: Use appropriately sized images (don't use massive 4000px images)
4. **HTTPS**: Use HTTPS URLs if your site is served over HTTPS

## 🎯 Pro Tip: AI-Generated Images

You could also use AI image generators like:
- **DALL-E** (OpenAI)
- **Midjourney**
- **Stable Diffusion**

Prompt example: "Portrait of Moses, biblical prophet, Renaissance painting style, oil painting, classical art"

---

**The app will work perfectly with just the letter placeholders OR with real images - your choice!** 🎨
