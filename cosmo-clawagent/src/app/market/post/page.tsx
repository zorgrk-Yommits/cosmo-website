import type { Metadata } from 'next';
import PostJobForm from './PostJobForm';

export const metadata: Metadata = {
  title: 'COSMO — Agent Market: post a job',
  description:
    'Post a job for digital work on the COSMO market. We review every job; approved jobs are listed and hand-picked pilot providers make offers. Posting costs nothing.',
};

export default function PostPage() {
  return <PostJobForm />;
}
