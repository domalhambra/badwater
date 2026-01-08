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
    const allFiles = getAllFiles(postsDir);

    for (const filePath of allFiles) {
        if (filePath.endsWith('.md')) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContent);

            if (data.sync === true) {
                const postSlug = data.slug || path.basename(filePath, '.md').toLowerCase().replace(/\s+/g, '-');
                const htmlBody = `${converter.makeHtml(content)}`;
                
                console.log(`--- Checking: ${postSlug} ---`);

                try {
                    // 1. Try to find if the post exists
                    const existingPosts = await api.posts.browse({filter: `slug:${postSlug}`, limit: '1'});
                    const postExists = existingPosts.length > 0;

                    if (postExists) {
                        // 2. UPDATE existing post
                        const postId = existingPosts[0].id;
                        await api.posts.edit({
                            id: postId,
                            updated_at: existingPosts[0].updated_at, // Required by Ghost for security
                            title: data.title || postSlug,
                            html: htmlBody,
                            status: data.status || 'draft',
                            tags: data.tags || [],
                            custom_excerpt: data.excerpt || '',
                            feature_image: data.feature_image || null
                        }, {source: 'html'});
                        console.log(`✅ Updated existing post: ${postSlug}`);
                    } else {
                        // 3. CREATE new post
                        await api.posts.add({
                            title: data.title || postSlug,
                            slug: postSlug,
                            html: htmlBody,
                            status: data.status || 'draft',
                            tags: data.tags || [],
                            custom_excerpt: data.excerpt || '',
                            feature_image: data.feature_image || null
                        }, {source: 'html'});
                        console.log(`✅ Created new post: ${postSlug}`);
                    }
                } catch (err) {
                    console.error(`❌ Error with ${postSlug}:`, err.message);
                }
            }
        }
    }
}

deploy();
