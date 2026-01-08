const GhostAdminApi = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 1. Setup the connection to Ghost
const api = new GhostAdminApi({
    url: process.env.GHOST_API_URL,
    key: process.env.GHOST_ADMIN_API_KEY,
    version: 'v5.0'
});

async function deploy() {
    // 2. Look for files in a specific folder (e.g., 'Posts')
    const postsDir = path.join(process.cwd(), 'Posts'); 
    const files = fs.readdirSync(postsDir);

    for (const file of files) {
        if (file.endsWith('.md')) {
            const filePath = path.join(postsDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContent);

            // 3. Only sync if you have 'sync: true' in your note's properties
            if (data.sync === true) {
                console.log(`Syncing: ${data.title}...`);
                
                try {
                    await api.posts.add({
                        title: data.title || file.replace('.md', ''),
                        html: content, // Ghost will convert basic markdown automatically
                        status: data.status || 'draft'
                    });
                    console.log(`Successfully sent ${data.title} to Ghost!`);
                } catch (err) {
                    console.error(`Error syncing ${file}:`, err.message);
                }
            }
        }
    }
}

deploy();
