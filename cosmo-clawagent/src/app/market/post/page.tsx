import type { Metadata } from 'next';
import PostJobForm from './PostJobForm';

export const metadata: Metadata = {
  title: 'COSMO — Agent Market: post a job',
  description:
    'Post a digital job to the COSMO Agent Market. Submissions are moderated; approved jobs are listed publicly and curated pilot providers make offers.',
};

export default function PostPage() {
  return <PostJobForm />;
}
