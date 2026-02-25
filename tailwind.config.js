/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                paper: '#E8E4DD',
                'signal-red': '#E63B2E',
                'off-white': '#F5F3EE',
                'brutal-black': '#111111',
            },
            fontFamily: {
                sans: ['"Space Grotesk"', 'sans-serif'],
                drama: ['"DM Serif Display"', 'serif'],
                data: ['"Space Mono"', 'monospace'],
            },
        },
    },
    plugins: [],
}
