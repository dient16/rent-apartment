import React from 'react';
import { Button, Input, DatePicker, Dropdown, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import icons from '@/utils/icons';
import { DropDownItem } from '@/components';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { useJsApiLoader } from '@react-google-maps/api';
import moment from 'moment';
const { PiUserThin } = icons;

const Search: React.FC = () => {
    const { isLoaded } = useJsApiLoader({
        id: 'rent-apartment',
        googleMapsApiKey: import.meta.env.VITE_API_GOOGLE_MAP,
        libraries: ['maps', 'places'],
    });

    const {
        handleSubmit,
        formState: { errors },
        control,
        getValues,
    } = useForm();
    const navigate = useNavigate();

    const handleSearch = (data: SearchData) => {
        const queryParams = new URLSearchParams({
            province: data.searchText,
            start_date: dayjs(data.searchDate[0]).format('YYYY-MM-DD'),
            end_date: dayjs(data.searchDate[1]).format('YYYY-MM-DD'),
            number_of_guest: data.searchGuest.guest.toString(),
            room_number: data.searchGuest.room.toString(),
        });
        navigate(`/listing?${queryParams.toString()}`);
    };

    return (
        isLoaded && (
            <form
                onSubmit={handleSubmit(handleSearch)}
                className="max-w-[920px] w-full min-h-[100px] bg-slate-50 rounded-3xl mt-[30px] flex justify-start items-center px-10 gap-5 flex-wrap py-10 lg:rounded-full lg:shadow-card-xl"
            >
                <Controller
                    control={control}
                    name="searchText"
                    rules={{
                        required: 'Please enter a destination',
                    }}
                    render={({ field }) => (
                        <Tooltip
                            title={errors?.searchText?.message as string}
                            color="red"
                            open={!!errors.searchText}
                            zIndex={5}
                        >
                            <Input
                                size="large"
                                placeholder="Search"
                                className="rounded-full py-3 px-5 w-[200px]"
                                {...field}
                            />
                        </Tooltip>
                    )}
                />

                <Controller
                    name="searchDate"
                    control={control}
                    rules={{
                        required: 'Please select the time',
                    }}
                    render={({ field }) => (
                        <Tooltip
                            title={errors?.searchDate?.message as string}
                            color="red"
                            open={!!errors.searchDate}
                            zIndex={5}
                        >
                            <DatePicker.RangePicker
                                format="DD-MM-YYYY"
                                className="font-main rounded-full px-5 py-3 min-w-[200px] max-w-[270px]"
                                inputReadOnly={true}
                                superNextIcon={null}
                                superPrevIcon={null}
                                placeholder={['Check in', 'Check out']}
                                popupClassName="show-card-md rounded-full"
                                {...field}
                                onChange={(dates) => field.onChange(dates)}
                                disabledDate={(current) => current && current < moment().startOf('day')}
                            />
                        </Tooltip>
                    )}
                />

                <Controller
                    name="searchGuest"
                    control={control}
                    rules={{
                        required: 'Date is required',
                    }}
                    defaultValue={{ guest: 1, room: 1 }}
                    render={({ field }) => (
                        <Tooltip title={errors?.searchGuest?.message as string} color="red" open={!!errors.searchGuest}>
                            <Dropdown
                                dropdownRender={() => (
                                    <DropDownItem value={field.value} onChange={(value) => field.onChange(value)} />
                                )}
                                placement="bottomLeft"
                                trigger={['click']}
                            >
                                <Button className="font-main px-5 h-[50px] rounded-full flex items-center gap-1 justify-center">
                                    <PiUserThin size={25} />
                                    <span className="">{`${getValues('searchGuest')?.guest || 1} adult · ${
                                        getValues('searchGuest')?.room || 1
                                    } rooms`}</span>
                                </Button>
                            </Dropdown>
                        </Tooltip>
                    )}
                />

                <Button
                    className="font-main px-5 h-[50px] rounded-full flex-grow bg-blue-500"
                    type="primary"
                    icon={<SearchOutlined />}
                    htmlType="submit"
                >
                    Search
                </Button>
            </form>
        )
    );
};

export default Search;
