import FeaturedPost from '@/components/home/FeaturedPost';
import Hero, { IndexNotice } from '@/components/home/Hero';
import PostListItem from '@/components/home/PostListItem';
import { fetchPosts } from '@/lib/posts';

export default async function ReadIndex() {
  const result = await fetchPosts();
  const posts = result?.posts ?? [];
  const [featured, ...rest] = posts;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8">
      <Hero total={result?.total ?? 0} lastPublished={featured?.published_date} />

      {posts.length === 0 && <IndexNotice unreachable={result === null} />}

      {featured && <FeaturedPost post={featured} />}

      {rest.length > 0 && (
        <section className="pt-12">
          <h2 className="t-label mb-2">More writing</h2>
          <ul className="stagger">
            {rest.map((p) => (
              <PostListItem key={p.id} post={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
