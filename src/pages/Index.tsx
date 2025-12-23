import { Helmet } from 'react-helmet-async';
import { KanbanBoard } from '@/components/KanbanBoard';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Sales Pipeline - Manage Your Leads</title>
        <meta name="description" content="A beautiful Kanban-style sales pipeline to manage leads and track client progress through your sales funnel." />
      </Helmet>
      <main>
        <KanbanBoard />
      </main>
    </>
  );
};

export default Index;
