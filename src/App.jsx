import { Routes, Route } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

import Main from './MainPage.jsx';
import Home from './world/Home.jsx';
import Map from './world/Map.jsx';
import Login from './components/auth/Login';
import Photo from './components/groupSpace/photo/PhotoModal';
import Comment from './components/groupSpace/comment/CommentModal.jsx';
import OauthHandler from './components/auth/OauthHandler';
import Signup from './components/auth/Signup';
import PhotoHeatMap from './components/groupSpace/photoHeatmap/PhotoHeatMap.jsx';
import Group from './components/group/Group.jsx';
import CreateGroup from './components/group/CreateGroup.jsx';
import StoryWrite from './components/groupSpace/radio/StoryWriteModal';
import StoryRead from './components/groupSpace/radio/StoryReadModal';
import Header from './components/navbar/Menubar.jsx';
import GroupDetail from './components/group/GroupDetail.jsx';
import SketchRoom from './components/groupSpace/sketch/SketchRoom.jsx';
import MafiaGame from './components/groupSpace/sketchmafia/MafiaGame.jsx';
import Loading from './components/common/Loading.jsx';
import PlayBgm from './components/bgm/PlayBgm.jsx';
import AuthenticationCheck from './hoc/Auth.jsx';

function App() {
  return (
    <div className='App cursor-custom'>
      <PlayBgm />
      <Header />
      <Routes>
        <Route path='/' element={AuthenticationCheck(Main, null)} />
        <Route path='/home' element={AuthenticationCheck(Home, true)} />
        <Route path='/signup' element={AuthenticationCheck(Signup, null)} />
        <Route path='/map/:woomsId' element={AuthenticationCheck(Map, true)} />
        <Route path='/sketch/:woomsId' element={AuthenticationCheck(SketchRoom, true)} />
        <Route path='/mafia/:woomsId' element={AuthenticationCheck(MafiaGame, true)} />
        <Route path='/login' element={AuthenticationCheck(Login, null)} />

        <Route path='/photo' element={<Photo />} />
        <Route path='/comment' element={<Comment />} />
        <Route path='/heatmap' element={<PhotoHeatMap />} />
        <Route path='/group' element={<Group />} />
        <Route path='/creategroup' element={<CreateGroup />} />
        <Route path='/group-detail' element={<GroupDetail />} />
        <Route path='/story-write' element={<StoryWrite />} />
        <Route path='/story-read' element={<StoryRead />} />
        <Route path='/loading' element={<Loading />} />
        <Route path='/auth/oauth-response' element={<OauthHandler />} />
      </Routes>
    </div>
  );
}

export default App;
