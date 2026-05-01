import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import classNames from 'classnames';

import { List as ImmutableList } from 'immutable';
import { useDebouncedCallback } from 'use-debounce';

import { expandFollowing, fetchFollowing } from '@/mastodon/actions/accounts';
import {
  expandTimelineByKey,
  timelineKey,
} from '@/mastodon/actions/timelines_typed';
import { Avatar } from '@/mastodon/components/avatar';
import { Column } from '@/mastodon/components/column';
import { ColumnHeader } from '@/mastodon/components/column_header';
import { useAccountHandle } from '@/mastodon/components/display_name/default';
import { DisplayNameSimple } from '@/mastodon/components/display_name/simple';
import { LoadingIndicator } from '@/mastodon/components/loading_indicator';
import { RelativeTimestamp } from '@/mastodon/components/relative_timestamp';
import ScrollableList from '@/mastodon/components/scrollable_list';
import StatusList from '@/mastodon/components/status_list';
import { useAccount } from '@/mastodon/hooks/useAccount';
import { useCurrentAccountId } from '@/mastodon/hooks/useAccountId';
import { domain } from '@/mastodon/initial_state';
import { selectTimelineByKey } from '@/mastodon/selectors/timelines';
import { selectUserListWithoutMe } from '@/mastodon/selectors/user_lists';
import { useAppDispatch, useAppSelector } from '@/mastodon/store';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';

import classes from './styles.module.scss';

const messages = defineMessages({
  title: { id: 'following_feed.title', defaultMessage: 'Following' },
});

const emptyList = ImmutableList<string>();

const FollowingFeed: FC<{ multiColumn: boolean }> = ({ multiColumn }) => {
  const intl = useIntl();
  const currentAccountId = useCurrentAccountId();
  const followingList = useAppSelector((state) =>
    selectUserListWithoutMe(state, 'following', currentAccountId),
  );
  const accounts = useAppSelector((state) => state.accounts);
  const dispatch = useAppDispatch();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (currentAccountId && !followingList) {
      dispatch(fetchFollowing(currentAccountId));
    }
  }, [currentAccountId, dispatch, followingList]);

  const sortedAccountIds = useMemo(() => {
    const items = followingList?.items ?? [];
    const lastPostTimestamps = new Map(
      items.map((id) => {
        const lastPostAt = accounts.get(id)?.last_status_at;
        const timestamp = lastPostAt ? Date.parse(lastPostAt) : 0;

        return [id, Number.isNaN(timestamp) ? 0 : timestamp];
      }),
    );

    return [...items].sort((a, b) => {
      return (lastPostTimestamps.get(b) ?? 0) - (lastPostTimestamps.get(a) ?? 0);
    });
  }, [accounts, followingList?.items]);

  const visibleSelectedAccountId =
    selectedAccountId && sortedAccountIds.includes(selectedAccountId)
      ? selectedAccountId
      : (sortedAccountIds[0] ?? null);

  const loadMoreFollowing = useDebouncedCallback(
    () => {
      if (currentAccountId) {
        dispatch(expandFollowing(currentAccountId));
      }
    },
    300,
    { leading: true },
  );

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(messages.title)}
      className={classes.column}
    >
      <ColumnHeader
        icon='groups'
        iconComponent={GroupsIcon}
        title={intl.formatMessage(messages.title)}
        multiColumn={multiColumn}
      />

      {!currentAccountId ? (
        <LoadingIndicator />
      ) : (
        <div className={classes.content}>
          <ScrollableList
            scrollKey='following_feed_accounts'
            hasMore={followingList?.hasMore}
            isLoading={followingList?.isLoading ?? true}
            onLoadMore={loadMoreFollowing}
            bindToDocument={false}
            emptyMessage={
              <FormattedMessage
                id='following_feed.empty'
                defaultMessage="You aren't following anyone yet."
              />
            }
            className={classes.accountsList}
          >
            {sortedAccountIds.map((accountId) => (
              <FollowingFeedAccount
                key={accountId}
                accountId={accountId}
                selected={accountId === visibleSelectedAccountId}
                onSelect={setSelectedAccountId}
              />
            ))}
          </ScrollableList>

          <FollowingFeedStatuses accountId={visibleSelectedAccountId} />
        </div>
      )}
    </Column>
  );
};

const FollowingFeedAccount: FC<{
  accountId: string;
  selected: boolean;
  onSelect: (accountId: string) => void;
}> = ({ accountId, selected, onSelect }) => {
  const account = useAccount(accountId);
  const handle = useAccountHandle(account, domain);

  const handleClick = useCallback(() => {
    onSelect(accountId);
  }, [accountId, onSelect]);

  if (!account) {
    return null;
  }

  return (
    <button
      type='button'
      className={classNames(classes.account, selected && classes.selected)}
      onClick={handleClick}
      data-hover-card-account={accountId}
    >
      <Avatar account={account} size={56} />
      <span className={classes.accountText}>
        <DisplayNameSimple account={account} className={classes.displayName} />
        <span className={classes.handle}>{handle}</span>
        <span className={classes.lastPost}>
          {account.last_status_at ? (
            <FormattedMessage
              id='following_feed.last_posted'
              defaultMessage='Last posted {date}'
              values={{
                date: (
                  <RelativeTimestamp
                    timestamp={account.last_status_at}
                  />
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id='following_feed.no_posts'
              defaultMessage='No posts yet'
            />
          )}
        </span>
      </span>
    </button>
  );
};

const FollowingFeedStatuses: FC<{ accountId: string | null }> = ({
  accountId,
}) => {
  const key = useMemo(
    () =>
      accountId
        ? timelineKey({
            type: 'account',
            userId: accountId,
            boosts: true,
            replies: true,
          })
        : null,
    [accountId],
  );
  const timeline = useAppSelector((state) =>
    key ? selectTimelineByKey(state, key) : null,
  );
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (key) {
      dispatch(expandTimelineByKey({ key }));
    }
  }, [dispatch, key]);

  const handleLoadMore = useCallback(
    (maxId?: string) => {
      if (key) {
        dispatch(expandTimelineByKey({ key, maxId }));
      }
    },
    [dispatch, key],
  );

  if (!accountId || !key) {
    return (
      <div className={classes.statusesEmpty}>
        <FormattedMessage
          id='following_feed.select_account'
          defaultMessage='Select someone you follow to see their recent posts.'
        />
      </div>
    );
  }

  return (
    <StatusList
      scrollKey={`following_feed_statuses_${accountId}`}
      statusIds={timeline?.items ?? emptyList}
      isLoading={timeline?.isLoading ?? true}
      hasMore={!!timeline?.hasMore}
      onLoadMore={handleLoadMore}
      emptyMessage={
        <FormattedMessage
          id='following_feed.empty_posts'
          defaultMessage='No recent posts found.'
        />
      }
      bindToDocument={false}
      timelineId='account'
      withCounters
      className={classes.statusesList}
    />
  );
};

// eslint-disable-next-line import/no-default-export -- Used by async components.
export default FollowingFeed;
