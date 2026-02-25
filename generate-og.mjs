import sharp from 'sharp';

const svgBuffer = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#111111"/>
    <!-- Scaled up inner icon geometry to roughly match the 32x32 proportions -->
    <path d="M 300 157 h 600 v 315 H 300 z" fill="none" stroke="#f6f5f0" stroke-width="20"/>
    <path d="M 450 275 h 300 m -300 80 h 300" stroke="#f6f5f0" stroke-width="20" stroke-linecap="square"/>
  </svg>`
);

sharp(svgBuffer)
    .png()
    .toFile('./public/og-image.png')
    .then((info) => {
        console.log("Successfully generated og-image.png", info);
    })
    .catch((err) => {
        console.error("Error generating og-image.png:", err);
    });
