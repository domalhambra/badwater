const GhostAdminApi = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const showdown = require('showdown');

const converter = new showdown.Converter();

const api = new GhostAdminApi({
    url: process.env.GHOST_API_URL,
    key: process.env.GHOST_ADMIN_API_KEY,
    version: 'v5.0'
});

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach((file) => {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
};

async function deploy() {
    const postsDir = path.join(process.cwd(), 'Posts'); 
    
    if (!fs.existsSync(postsDir)) {
        console.error("Error: 'Posts' folder not found!");
        return;
    }

    const allFiles = getAllFiles(postsDir);

    for (const filePath of allFiles) {
        if (filePath.endsWith('.md')) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContent);

            if (data.sync === true) {
                console.log(`--- Processing: ${data.title || filePath} ---`);
                
                // Debug: See if 'content' is actually being read
                console.log(`Character count in body: ${content.trim().length}`);

                const htmlBody = converter.makeHtml(content);
                
                try {
                    await api.posts.add({
                        title: data.title || path.basename(filePath, '.md'),
                        html: htmlBody,
                        status: data.status || 'draft',
                        
                        // Add these new lines:
                        tags: data.tags || [],            // Must be an array like [Tag1, Tag2]
                        custom_excerpt: data.excerpt,      // Pulls from 'excerpt:' in YAML
                        feature_image: data.feature_image, // Pulls from 'feature_image:'
                        slug: data.slug,                  // Pulls from 'slug:'
                        featured: data.featured || false   // Pulls from 'featured: true'
                    }, {source: 'html'}); 
                    console.log(`✅ Success: Sent to Ghost!`);
                } catch (err) {
                    console.error(`❌ Ghost API Error:`, err.message);
                }
            }
        }
    }
}

deploy();
