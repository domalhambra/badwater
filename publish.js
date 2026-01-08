const GhostAdminApi = require('@tryghost/admin-api');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const api = new GhostAdminApi({
    url: process.env.GHOST_API_URL,
    key: process.env.GHOST_ADMIN_API_KEY,
    version: 'v5.0'
});

// This function "walks" through all your folders
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
                console.log(`Syncing: ${data.title}...`);
                try {
                    await api.posts.add({
                        title: data.title || path.basename(filePath, '.md'),
                        html: content,
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
