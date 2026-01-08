const GhostAdminApi = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

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
    const allFiles = getAllFiles(postsDir);

    for (const filePath of allFiles) {
        if (filePath.endsWith('.md')) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContent);

            if (data.sync === true) {
                // Convert Markdown to HTML here
                const htmlContent = converter.makeHtml(content);
                
                console.log(`Syncing: ${data.title}...`);
                try {
                    await api.posts.add({
                        title: data.title || path.basename(filePath, '.md'),
                        html: htmlContent, // Sending HTML instead of raw text
                        status: data.status || 'draft'
                    });
                    console.log(`Successfully sent ${data.title} to Ghost!`);
                } catch (err) {
                    console.error(`Error syncing ${filePath}:`, err.message);
                }
            }
        }
    }
}

deploy();
