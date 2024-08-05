import { useState, useEffect } from 'react';
import axios from 'axios';
import ModalClose from '../../common/ModalClose';
import Button from '../../common/Button';
import DropDown from '../../common/DropDown';

const baseUrl = 'https://i11e206.p.ssafy.io';

const ChooseUser = ({ onClose, onChange, onNext }) => {
  const [groups, setGroups] = useState([
    {
      woomsId: 1,
      woomsTitle: '그룹 1',
    },
    {
      woomsId: 2,
      woomsTitle: '그룹 2',
    },
    {
      woomsId: 3,
      woomsTitle: '그룹 3',
    },
  ]);
  const [users, setUsers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedGroupLabel, setSelectedGroupLabel] = useState('그룹 선택');
  const [selectedUserLabel, setSelectedUserLabel] = useState('유저 선택');

  useEffect(() => {
    const getGroups = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/wooms`, {
          withCredentials: true,
        });
        setGroups(response.data);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      }
    };

    getGroups();
  }, []);

  const handleGroupSelect = async (option) => {
    const groupId = option.value;
    const groupTitle = option.label;

    setSelectedGroup(groupId);
    setSelectedGroupLabel(groupTitle);

    if (groupId) {
      try {
        const response = await axios.get(
          `${baseUrl}/api/wooms/${groupId}/info`,
          {
            withCredentials: true,
          }
        );
        console.log(response.data.userInfoDtoList);
        setUsers(response.data.userInfoDtoList);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    } else {
      setUsers([]);
    }
  };

  const handleUserSelect = (option) => {
    const selectedUserUuid = option.value;
    const selectedUser = users.find((user) => user.uuid === selectedUserUuid);

    setSelectedUserLabel(option.label);
    onChange(selectedUser);
  };

  const groupOptions = groups.map((group) => ({
    label: group.woomsTitle,
    value: group.woomsId,
  }));

  const userOptions = users.map((user) => ({
    label: user.nickname,
    value: user.uuid,
  }));

  return (
    <ModalClose onClose={onClose}>
      <section className='flex flex-col h-5/6 justify-between text-center'>
        <h1 className='text-4xl text-center mt-4'>누구에게 편지를 쓸까요?</h1>
        <div className='flex items-center justify-center space-x-4 mt-4'>
          <div className='w-1/3 flex justify-center'>
            <DropDown
              options={groupOptions}
              placeholder={selectedGroupLabel}
              onSelect={handleGroupSelect}
            />
          </div>
          <div className='w-1/3 flex justify-center'>
            <DropDown
              options={userOptions}
              placeholder={selectedUserLabel}
              onSelect={handleUserSelect}
            />
          </div>
        </div>
        <div className='flex justify-center mt-8'>
          <Button label={'편지 쓰기'} onClick={onNext} />
        </div>
      </section>
    </ModalClose>
  );
};

export default ChooseUser;
